import { supabase } from './supabaseClient.js';
import * as gameLogic from './gameLogic.js';

/**
 * Room Manager - Simplified and robust room state management
 */

const rooms = new Map();

/**
 * Helper function to check if a user ID is a UUID (authenticated user)
 * Guest users have IDs like "guest_1234567890_abc123"
 */
function isUUID(userId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}

/**
 * Create a new room
 */
// Maximum number of concurrent rooms (memory limit)
const MAX_ROOMS = 50;

export function createRoom(lobbyId, lobbyData) {
  // Enforce room limit
  if (rooms.size >= MAX_ROOMS) {
    console.warn(`⚠️ Room limit reached (${MAX_ROOMS}), cleaning up oldest inactive rooms`);
    cleanupOldestRooms();
  }

  const room = {
    lobbyId,
    gameId: null,
    players: [],
    roundNumber: 1,
    phase: 'waiting',
    activeRules: [],
    eliminationCount: 0,
    roundTimer: lobbyData.roundTimer || 60,
    timerInterval: null,
    timeRemaining: lobbyData.roundTimer || 60,
    // Removed roundHistory to save memory
    roundStartTime: null,
    currentRoundId: null,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  rooms.set(lobbyId, room);
  console.log(`✅ Created room: ${lobbyId} (Total rooms: ${rooms.size})`);
  return room;
}

/**
 * Cleanup oldest inactive rooms when limit is reached
 */
function cleanupOldestRooms() {
  const now = Date.now();
  const inactiveThreshold = 10 * 60 * 1000; // 10 minutes
  
  const sortedRooms = Array.from(rooms.entries())
    .map(([id, room]) => ({ id, room, lastActivity: room.lastActivity || room.createdAt }))
    .sort((a, b) => a.lastActivity - b.lastActivity);

  // Remove oldest inactive rooms
  for (const { id, lastActivity } of sortedRooms) {
    if (rooms.size <= MAX_ROOMS * 0.8) break; // Keep at least 80% capacity
    
    if (now - lastActivity > inactiveThreshold) {
      const room = rooms.get(id);
      if (room && room.phase === 'waiting') {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
        }
        rooms.delete(id);
        console.log(`🧹 Cleaned up inactive room: ${id}`);
      }
    }
  }
}

/**
 * Get room by lobby ID
 */
export function getRoom(lobbyId) {
  return rooms.get(lobbyId);
}

/**
 * Delete room
 */
export function deleteRoom(lobbyId) {
  const room = rooms.get(lobbyId);
  if (room?.timerInterval) {
    clearInterval(room.timerInterval);
  }
  rooms.delete(lobbyId);
  console.log(`🗑️  Deleted room: ${lobbyId}`);
}

/**
 * Add player to room
 */
export function addPlayerToRoom(lobbyId, playerData) {
  const room = getRoom(lobbyId);
  if (!room) {
    console.error(`❌ Room ${lobbyId} not found when adding player`);
    return null;
  }

  // Update last activity
  room.lastActivity = Date.now();

  // Check if player already exists
  const existingPlayer = room.players.find(p => p.userId === playerData.userId);
  if (existingPlayer) {
    // Update socket ID
    existingPlayer.socketId = playerData.socketId;
    return existingPlayer;
  }

  const player = {
    socketId: playerData.socketId,
    userId: playerData.userId,
    username: playerData.username,
    avatar: playerData.avatar,
    score: 0,
    isEliminated: false,
    hasSubmitted: false,
    currentChoice: null,
    isReady: false,
    isGuest: playerData.isGuest || false,
    isConnected: true, // Track connection status
    disconnectedAt: null
  };

  room.players.push(player);
  console.log(`➕ Added player ${playerData.username} to room ${lobbyId}`);
  return player;
}

/**
 * Remove player from room (mark as disconnected, don't remove during active games)
 */
export function removePlayerFromRoom(lobbyId, socketId) {
  const room = getRoom(lobbyId);
  if (!room) return null;

  const playerIndex = room.players.findIndex(p => p.socketId === socketId);
  if (playerIndex === -1) return null;

  const player = room.players[playerIndex];
  
  // If game is active, mark as disconnected instead of removing
  if (room.phase !== 'waiting' && room.phase !== 'finished') {
    player.isConnected = false;
    player.disconnectedAt = Date.now();
    player.socketId = null; // Clear socket ID
    console.log(`⚠️ Player ${player.userId} disconnected from active game`);
    return player;
  }

  // Only remove if in waiting phase
  room.players.splice(playerIndex, 1);

  // If no players left and not in game, delete room
  if (room.players.length === 0 && room.phase === 'waiting') {
    deleteRoom(lobbyId);
  }

  return player;
}

/**
 * Mark player as reconnected
 */
export function reconnectPlayer(lobbyId, userId, socketId) {
  const room = getRoom(lobbyId);
  if (!room) return false;

  const player = room.players.find(p => p.userId === userId);
  if (player) {
    player.isConnected = true;
    player.socketId = socketId;
    player.disconnectedAt = null;
    console.log(`✅ Player ${userId} reconnected to game`);
    return true;
  }
  
  return false;
}

/**
 * Get room state for client
 */
export function getRoomState(lobbyId) {
  const room = getRoom(lobbyId);
  if (!room) return null;

  return {
    roundNumber: room.roundNumber,
    phase: room.phase,
    activeRules: room.activeRules,
    timeRemaining: room.timeRemaining,
    players: room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      isEliminated: p.isEliminated,
      hasSubmitted: p.hasSubmitted,
      isReady: p.isReady === true, // Explicitly ensure boolean
      isConnected: p.isConnected !== false // Default to true if undefined
    }))
  };
}

/**
 * Start game
 */
export async function startGame(lobbyId, io) {
  const room = getRoom(lobbyId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  try {
    // Create game record
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        lobby_id: lobbyId,
        current_round: 1,
        status: 'active',
        rules_unlocked: []
      })
      .select()
      .single();

    if (gameError) {
      console.error('Error creating game:', gameError);
      return { success: false, error: 'Failed to create game' };
    }

    room.gameId = gameData.id;

    // Create game_players records (only for authenticated users with UUIDs)
    const authenticatedPlayers = room.players.filter(p => isUUID(p.userId));
    if (authenticatedPlayers.length > 0) {
      const gamePlayers = authenticatedPlayers.map(p => ({
        game_id: gameData.id,
        user_id: p.userId,
        score: 0,
        is_eliminated: false
      }));

      const { error: playersError } = await supabase
        .from('game_players')
        .insert(gamePlayers);

      if (playersError) {
        console.error('Error creating game players:', playersError);
        return { success: false, error: 'Failed to create game players' };
      }
    }

    // Update lobby status
    await supabase
      .from('lobbies')
      .update({ status: 'in_progress' })
      .eq('id', lobbyId);

    // Start first round
    await startRound(lobbyId, io);

    return { success: true, gameId: gameData.id };
  } catch (error) {
    console.error('Error in startGame:', error);
    return { success: false, error: 'Failed to start game' };
  }
}

/**
 * Start a new round
 */
export async function startRound(lobbyId, io) {
  const room = getRoom(lobbyId);
  if (!room) return;

  // Update last activity
  room.lastActivity = Date.now();

  // Reset player submissions
  room.players.forEach(player => {
    if (!player.isEliminated) {
      player.hasSubmitted = false;
      player.currentChoice = null;
    }
  });

  room.phase = 'submission';
  room.timeRemaining = room.roundTimer;
  room.roundStartTime = Date.now();

  // Update active rules
  room.activeRules = gameLogic.getActiveRules(room.eliminationCount);

  // Create round record
  const { data: roundData, error } = await supabase
    .from('game_rounds')
    .insert({
      game_id: room.gameId,
      round_number: room.roundNumber,
      status: 'waiting'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating round:', error);
  } else {
    room.currentRoundId = roundData.id;
  }

  // Emit round start with optimized player data
  const playerData = room.players.map(p => ({
    userId: p.userId,
    username: p.username,
    avatar: p.avatar,
    score: p.score,
    isEliminated: p.isEliminated,
    hasSubmitted: p.hasSubmitted,
    isConnected: p.isConnected !== false
  }));
  
  io.to(lobbyId).emit('round_start', {
    roundNumber: room.roundNumber,
    timeRemaining: room.timeRemaining,
    activeRules: room.activeRules,
    players: playerData
  });

  // Start timer
  startRoundTimer(lobbyId, io);
}

/**
 * Start round timer
 */
function startRoundTimer(lobbyId, io) {
  const room = getRoom(lobbyId);
  if (!room) return;

  // Clear existing timer
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.timerInterval = setInterval(() => {
    room.timeRemaining--;

    io.to(lobbyId).emit('timer_update', { timeRemaining: room.timeRemaining });

    if (room.timeRemaining <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      processRound(lobbyId, io);
    }
  }, 1000);
}

/**
 * Submit player choice
 */
export async function submitChoice(lobbyId, userId, choice, io) {
  const room = getRoom(lobbyId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Update last activity
  room.lastActivity = Date.now();

  if (room.phase !== 'submission') {
    return { success: false, error: 'Not in submission phase' };
  }

  const player = room.players.find(p => p.userId === userId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  if (!player.isConnected) {
    return { success: false, error: 'You are disconnected. Please reconnect.' };
  }

  if (player.isEliminated) {
    return { success: false, error: 'Player is eliminated' };
  }

  if (player.hasSubmitted) {
    return { success: false, error: 'Already submitted' };
  }

  // Validate choice
  const otherChoices = room.players
    .filter(p => p.hasSubmitted && p.userId !== userId && !p.isEliminated)
    .map(p => ({ number: p.currentChoice, userId: p.userId }));

  const validation = gameLogic.validateChoice(choice, otherChoices, room.activeRules, userId);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  // Store choice
  player.currentChoice = choice;
  player.hasSubmitted = true;

  // Save to database (only for authenticated users) - use fire and forget to reduce latency
  if (room.currentRoundId && isUUID(userId)) {
    supabase
      .from('player_choices')
      .insert({
        round_id: room.currentRoundId,
        user_id: userId,
        choice: choice
      })
      .catch(err => console.error('Error saving choice to DB:', err));
  }

  // Notify all players with minimal data
  io.to(lobbyId).emit('player_submitted', {
    userId: userId,
    username: player.username
  });

  // Check if all active players have submitted
  const activePlayers = room.players.filter(p => !p.isEliminated && p.isConnected !== false);
  const allSubmitted = activePlayers.length > 0 && activePlayers.every(p => p.hasSubmitted);

  if (allSubmitted) {
    // Clear timer and process immediately
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    setTimeout(() => processRound(lobbyId, io), 1000);
  }

  return { success: true };
}

/**
 * Process round results
 */
async function processRound(lobbyId, io) {
  const room = getRoom(lobbyId);
  if (!room) return;

  room.phase = 'reveal';

  // Get all choices (only from connected players)
  const choices = room.players
    .filter(p => p.hasSubmitted && !p.isEliminated && p.isConnected !== false)
    .map(p => ({ number: p.currentChoice, userId: p.userId, username: p.username }));

  // If no valid choices, end game
  if (choices.length === 0) {
    console.log(`⚠️ No valid choices in round ${room.roundNumber} for lobby ${lobbyId}, ending game`);
    await endGame(lobbyId, io);
    return;
  }

  // Check if there are any connected active players left
  const connectedActivePlayers = room.players.filter(p => !p.isEliminated && p.isConnected !== false);
  if (connectedActivePlayers.length === 0) {
    console.log(`⚠️ No connected active players in lobby ${lobbyId}, ending game`);
    await endGame(lobbyId, io);
    return;
  }

  // Check for Rule 3 special win (0 vs 100)
  let winnerId = null;
  if (room.activeRules.includes(3)) {
    winnerId = gameLogic.checkSpecialWin(choices);
  }

  // Calculate winning number
  let average, winningNumber;
  ({ average, winningNumber } = gameLogic.calculateWinningNumber(choices));
  
  if (!winnerId) {
    winnerId = gameLogic.findWinner(room.players, choices, winningNumber);
  }

  // Check for exact match
  const isExactMatch = gameLogic.checkExactMatch(choices, winningNumber);

  // Emit reveal
  io.to(lobbyId).emit('round_reveal', {
    choices: choices,
    average: average,
    winningNumber: winningNumber,
    winnerId: winnerId
  });

  // Wait for reveal animation then process scoring
  setTimeout(() => {
    processScoring(lobbyId, winnerId, isExactMatch, io);
  }, 5000);
}

/**
 * Process scoring
 */
async function processScoring(lobbyId, winnerId, isExactMatch, io) {
  const room = getRoom(lobbyId);
  if (!room) return;

  room.phase = 'scoring';

  // Apply score changes
  const scoreUpdates = gameLogic.applyScoreChanges(room.players, winnerId, isExactMatch, room.activeRules);

  // Update player scores
  for (const player of room.players) {
    if (scoreUpdates[player.userId]) {
      player.score = scoreUpdates[player.userId].newScore;
    }
  }

  // Check for eliminations
  const newlyEliminated = gameLogic.checkEliminations(room.players);
  const eliminatedPlayers = [];
  const eliminatedUpdates = []; // Batch database updates

  for (const userId of newlyEliminated) {
    const player = room.players.find(p => p.userId === userId);
    if (player) {
      player.isEliminated = true;
      room.eliminationCount++;
      eliminatedPlayers.push({
        userId: userId,
        username: player.username
      });

      // Collect database updates for batching
      if (room.gameId && isUUID(userId)) {
        eliminatedUpdates.push({
          game_id: room.gameId,
          user_id: userId,
          is_eliminated: true,
          eliminated_at_round: room.roundNumber,
          score: player.score
        });
      }
    }
  }

  // Emit score update immediately (don't wait for DB)
  io.to(lobbyId).emit('round_scored', {
    scoreUpdates: scoreUpdates,
    eliminatedPlayers: eliminatedPlayers,
    newRulesUnlocked: eliminatedPlayers.length > 0 ? gameLogic.getActiveRules(room.eliminationCount) : []
  });

  // Batch database updates (fire-and-forget to reduce latency)
  if (room.gameId) {
    (async () => {
      try {
        // Batch update eliminated players
        if (eliminatedUpdates.length > 0) {
          const updatePromises = eliminatedUpdates.map(update =>
            supabase
              .from('game_players')
              .update({
                is_eliminated: update.is_eliminated,
                eliminated_at_round: update.eliminated_at_round,
                score: update.score
              })
              .eq('game_id', update.game_id)
              .eq('user_id', update.user_id)
          );
          await Promise.all(updatePromises);
        }

        // Update round in database
        if (room.currentRoundId) {
          const roundUpdate = {
            status: 'completed',
            completed_at: new Date().toISOString()
          };
          
          // Only set winner_id if it's a UUID (authenticated user)
          if (winnerId && isUUID(winnerId)) {
            roundUpdate.winner_id = winnerId;
          }
          
          await supabase
            .from('game_rounds')
            .update(roundUpdate)
            .eq('id', room.currentRoundId);
        }

        // Update game record
        await supabase
          .from('games')
          .update({
            current_round: room.roundNumber,
            rules_unlocked: room.activeRules
          })
          .eq('id', room.gameId);
      } catch (dbError) {
        console.error('Error updating database in processScoring:', dbError);
      }
    })();
  }

  // Check if game is over
  if (gameLogic.isGameOver(room.players)) {
    setTimeout(() => endGame(lobbyId, io), 3000);
  } else {
    // Next round
    setTimeout(() => {
      room.roundNumber++;
      startRound(lobbyId, io);
    }, 5000);
  }
}

/**
 * End game
 */
async function endGame(lobbyId, io) {
  const room = getRoom(lobbyId);
  if (!room) return;

  room.phase = 'finished';

  // Get final standings
  const standings = gameLogic.getFinalStandings(room.players);

  // Emit game over immediately (don't wait for DB)
  io.to(lobbyId).emit('game_over', {
    standings: standings.map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      isEliminated: p.isEliminated
    }))
  });

  // Update game status (fire-and-forget to reduce latency)
  if (room.gameId) {
    (async () => {
      try {
        await supabase
          .from('games')
          .update({ status: 'finished' })
          .eq('id', room.gameId);

        // Update lobby status
        await supabase
          .from('lobbies')
          .update({ status: 'finished' })
          .eq('id', lobbyId);

        // Update player stats (only for authenticated users) - batch these
        const statsPromises = [];
        for (let i = 0; i < standings.length; i++) {
          const player = standings[i];
          
          // Skip guest users
          if (!isUUID(player.userId)) {
            continue;
          }
          
          const isWinner = i === 0 && !player.isEliminated;

          statsPromises.push(
            supabase.rpc('increment_user_stats', {
              p_user_id: player.userId,
              p_games_won: isWinner ? 1 : 0,
              p_rounds_played: room.roundNumber,
              p_rounds_survived: player.isEliminated ? (player.eliminatedAtRound || room.roundNumber) : room.roundNumber
            })
          );
        }
        
        // Execute stats updates in parallel
        if (statsPromises.length > 0) {
          await Promise.all(statsPromises);
        }
      } catch (dbError) {
        console.error('Error updating database in endGame:', dbError);
      }
    })();
  }

  // Clean up room after delay (reduced from 5 minutes to 2 minutes)
  setTimeout(() => {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
    }
    // Reset lobby status to 'waiting' when room is deleted, allowing new games
    supabase
      .from('lobbies')
      .update({ status: 'waiting' })
      .eq('id', lobbyId)
      .then(() => {
        console.log(`🔄 Reset lobby ${lobbyId} status to 'waiting' after game end`);
      })
      .catch(err => {
        console.error(`Error resetting lobby status for ${lobbyId}:`, err);
      });
    deleteRoom(lobbyId);
  }, 120000); // 2 minutes (reduced from 5 minutes)
}

/**
 * Get number of active rooms
 */
export function getActiveRooms() {
  return rooms.size;
}
