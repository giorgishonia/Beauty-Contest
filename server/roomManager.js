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
export function createRoom(lobbyId, lobbyData) {
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
    roundHistory: [],
    roundStartTime: null,
    currentRoundId: null
  };

  rooms.set(lobbyId, room);
  console.log(`✅ Created room: ${lobbyId}`);
  return room;
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

  // Emit round start
  io.to(lobbyId).emit('round_start', {
    roundNumber: room.roundNumber,
    timeRemaining: room.timeRemaining,
    activeRules: room.activeRules,
    players: room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      isEliminated: p.isEliminated,
      hasSubmitted: p.hasSubmitted,
      isConnected: p.isConnected !== false
    }))
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

  // Save to database (only for authenticated users)
  if (room.currentRoundId && isUUID(userId)) {
    await supabase
      .from('player_choices')
      .insert({
        round_id: room.currentRoundId,
        user_id: userId,
        choice: choice
      });
  }

  // Notify all players
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

  for (const userId of newlyEliminated) {
    const player = room.players.find(p => p.userId === userId);
    if (player) {
      player.isEliminated = true;
      room.eliminationCount++;
      eliminatedPlayers.push({
        userId: userId,
        username: player.username
      });

      // Update database (only for authenticated users)
      if (room.gameId && isUUID(userId)) {
        await supabase
          .from('game_players')
          .update({
            is_eliminated: true,
            eliminated_at_round: room.roundNumber,
            score: player.score
          })
          .eq('game_id', room.gameId)
          .eq('user_id', userId);
      }
    }
  }

  // Emit score update
  io.to(lobbyId).emit('round_scored', {
    scoreUpdates: scoreUpdates,
    eliminatedPlayers: eliminatedPlayers,
    newRulesUnlocked: eliminatedPlayers.length > 0 ? gameLogic.getActiveRules(room.eliminationCount) : []
  });

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
  if (room.gameId) {
    await supabase
      .from('games')
      .update({
        current_round: room.roundNumber,
        rules_unlocked: room.activeRules
      })
      .eq('id', room.gameId);
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

  // Update game status
  if (room.gameId) {
    await supabase
      .from('games')
      .update({ status: 'finished' })
      .eq('id', room.gameId);

    // Update lobby status
    await supabase
      .from('lobbies')
      .update({ status: 'finished' })
      .eq('id', lobbyId);

    // Update player stats (only for authenticated users)
    for (let i = 0; i < standings.length; i++) {
      const player = standings[i];
      
      // Skip guest users
      if (!isUUID(player.userId)) {
        continue;
      }
      
      const isWinner = i === 0 && !player.isEliminated;

      await supabase.rpc('increment_user_stats', {
        p_user_id: player.userId,
        p_games_won: isWinner ? 1 : 0,
        p_rounds_played: room.roundNumber,
        p_rounds_survived: player.isEliminated ? (player.eliminatedAtRound || room.roundNumber) : room.roundNumber
      });
    }
  }

  // Emit game over
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

  // Clean up room after delay
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
  }, 300000); // 5 minutes
}

/**
 * Get number of active rooms
 */
export function getActiveRooms() {
  return rooms.size;
}
