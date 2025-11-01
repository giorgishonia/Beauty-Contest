import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient.js';
import * as roomManager from './roomManager.js';
import { roomCleanupService } from './roomCleanup.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Configure Socket.IO with multiple allowed origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'https://b8c0af9231d1.ngrok-free.app',
  'https://de93ff38ed5a.ngrok-free.app',
  'https://5f695b504ed7.ngrok-free.app'
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin matches allowed origins or is an ngrok host
      if (allowedOrigins.includes(origin) || 
          origin.includes('.ngrok-free.app') || 
          origin.includes('.ngrok.io')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || 
        origin.includes('.ngrok-free.app') || 
        origin.includes('.ngrok.io')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Create lobby endpoint (for guests)
app.post('/api/lobbies', async (req, res) => {
  try {
    const { name, hostId, maxPlayers, roundTimer, password } = req.body;

    if (!name || !hostId || !maxPlayers || !roundTimer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`📝 Creating lobby: "${name}" by host ${hostId}`);

    // Create lobby using service role (bypasses RLS)
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .insert({
        name: name.trim(),
        host_id: hostId, // Can be guest ID (text) or UUID
        max_players: maxPlayers,
        round_timer: roundTimer,
        password: password?.trim() || null,
        status: 'waiting'
      })
      .select()
      .single();

    if (lobbyError) {
      console.error('❌ Error creating lobby:', lobbyError);
      console.error('Lobby error details:', JSON.stringify(lobbyError, null, 2));
      return res.status(500).json({ 
        error: 'Failed to create lobby',
        details: lobbyError.message || 'Unknown error'
      });
    }

    console.log(`✅ Lobby created successfully: ${lobby.id}`);
    res.json({ lobby });
  } catch (error) {
    console.error('❌ Error in create lobby endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedSockets: io.sockets.sockets.size,
    activeRooms: roomManager.getActiveRooms()
  });
});

// Socket connection tracking
const socketToUser = new Map(); // socket.id -> { userId, lobbyId }
const userToSocket = new Map(); // userId -> socket.id

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔗 Client connected: ${socket.id}`);

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    
    const userInfo = socketToUser.get(socket.id);
    if (userInfo) {
      userToSocket.delete(userInfo.userId);
      socketToUser.delete(socket.id);
      
      // Handle player disconnection
      if (userInfo.lobbyId) {
        const player = roomManager.removePlayerFromRoom(userInfo.lobbyId, socket.id);
        
        if (player) {
          // If player was removed (waiting phase), notify others
          if (!player.isConnected) {
            // Player marked as disconnected (active game)
            io.to(userInfo.lobbyId).emit('player_disconnected', {
              userId: userInfo.userId,
              username: player.username
            });
          } else {
            // Player was removed (waiting phase)
            io.to(userInfo.lobbyId).emit('player_left', {
              userId: userInfo.userId,
              username: player.username
            });
          }
          
          // Broadcast updated room state
          const roomState = roomManager.getRoomState(userInfo.lobbyId);
          if (roomState) {
            io.to(userInfo.lobbyId).emit('room_state', roomState);
          }
        }
      }
    }
  });

  // Join lobby
  socket.on('join_lobby', async (data) => {
    try {
      const { lobbyId, userId, token, isGuest, guestData } = data;

      if (!lobbyId || !userId) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Get user profile - everyone is treated as guest now
      let profile;
      if (isGuest && guestData) {
        profile = {
          id: guestData.id,
          username: guestData.username,
          selected_avatar: guestData.selected_avatar || null,
          isGuest: true
        };
      } else if (token) {
        // Try to get profile from database if token is provided
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser(token);
          
          if (authUser && authUser.id === userId) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (profileData) {
              profile = {
                id: profileData.id,
                username: profileData.username,
                selected_avatar: profileData.selected_avatar || null,
                isGuest: false
              };
            } else {
              // Profile doesn't exist, treat as guest
              socket.emit('error', { message: 'Profile not found' });
              return;
            }
          } else {
            socket.emit('error', { message: 'Authentication failed' });
            return;
          }
        } catch (authError) {
          // Auth failed, require guest data
          socket.emit('error', { message: 'Authentication failed' });
          return;
        }
      } else {
        // No token and not guest - require guest data
        socket.emit('error', { message: 'Authentication required. Please provide guest data or token.' });
        return;
      }

      // Verify lobby exists and allow reconnection during active games
      const { data: lobby, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single();

      if (lobbyError || !lobby) {
        socket.emit('error', { message: 'Lobby not found' });
        return;
      }

      // Check if player is trying to reconnect to an active game
      const existingRoom = roomManager.getRoom(lobbyId);
      const existingPlayer = existingRoom?.players.find(p => p.userId === userId);
      
      // Check if there's actually an active game (room exists and is in active phase)
      const hasActiveGame = existingRoom && 
        existingRoom.phase !== 'waiting' && 
        existingRoom.phase !== 'finished';
      
      // Check if player is already in the room (either connected or disconnected)
      const isPlayerInRoom = existingPlayer !== undefined;
      
      // Check if player is reconnecting (was disconnected)
      const isReconnecting = existingPlayer && !existingPlayer.isConnected;
      
      // Check if user is host
      const isHost = lobby.host_id === userId;
      
      // If lobby status says 'in_progress' but there's no active game, reset the status
      if (lobby.status === 'in_progress' && !hasActiveGame) {
        console.log(`⚠️ Stale lobby status detected for ${lobbyId}, resetting to 'waiting'`);
        await supabase
          .from('lobbies')
          .update({ status: 'waiting' })
          .eq('id', lobbyId);
        lobby.status = 'waiting'; // Update local reference
      }
      
      // Allow joining if:
      // 1. Lobby is waiting (normal join)
      // 2. Player is already in the room (navigating between pages, reconnecting, etc.)
      // 3. Player is the host (host should always be able to access their lobby)
      // 4. Lobby is finished (view results)
      // 5. No active game exists (even if status was stale)
      if (hasActiveGame && !isPlayerInRoom && !isHost) {
        socket.emit('error', { message: 'Game is already in progress. Please wait for it to finish.' });
        return;
      }

      // Check if lobby is full (only count connected players)
      const connectedPlayers = existingRoom?.players.filter(p => p.isConnected !== false).length || 0;
      
      if (connectedPlayers >= lobby.max_players) {
        socket.emit('error', { message: 'Lobby is full' });
        return;
      }

      // Leave previous lobby if exists
      const previousUserInfo = socketToUser.get(socket.id);
      if (previousUserInfo?.lobbyId && previousUserInfo.lobbyId !== lobbyId) {
        socket.leave(previousUserInfo.lobbyId);
        roomManager.removePlayerFromRoom(previousUserInfo.lobbyId, socket.id);
      }

      // Handle case where user already has another socket connection
      const existingSocketId = userToSocket.get(userId);
      if (existingSocketId && existingSocketId !== socket.id) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          // Disconnect the old socket connection
          console.log(`🔄 User ${userId} has existing connection ${existingSocketId}, closing it`);
          existingSocket.disconnect();
        }
        userToSocket.delete(userId);
      }

      // Join socket room
      socket.join(lobbyId);

      // Track user
      socketToUser.set(socket.id, { userId, lobbyId });
      userToSocket.set(userId, socket.id);

      // Get or create room
      let gameRoom = roomManager.getRoom(lobbyId);
      if (!gameRoom) {
        // Ensure lobby status is 'waiting' when creating a new room
        if (lobby.status !== 'waiting') {
          console.log(`⚠️ Creating room for lobby ${lobbyId} with status ${lobby.status}, resetting to 'waiting'`);
          await supabase
            .from('lobbies')
            .update({ status: 'waiting' })
            .eq('id', lobbyId);
        }
        gameRoom = roomManager.createRoom(lobbyId, {
          roundTimer: lobby.round_timer
        });
      } else {
        // If room exists but lobby status is 'finished', reset it
        if (lobby.status === 'finished' && gameRoom.phase === 'waiting') {
          console.log(`⚠️ Resetting finished lobby ${lobbyId} to 'waiting' for new game`);
          await supabase
            .from('lobbies')
            .update({ status: 'waiting' })
            .eq('id', lobbyId);
        }
      }

      // Check if player already exists (reconnection or navigating between pages)
      const roomPlayer = gameRoom.players.find(p => p.userId === userId);
      if (roomPlayer) {
        // Update socket connection info
        const wasDisconnected = !roomPlayer.isConnected;
        roomPlayer.isConnected = true;
        roomPlayer.socketId = socket.id;
        roomPlayer.disconnectedAt = null;
        
        // Sync ready status from database for authenticated users only
        // Guests don't have database records, so skip this
        if (!profile.isGuest && token) {
          try {
            const { data: existing } = await supabase
              .from('lobby_players')
              .select('is_ready')
              .eq('lobby_id', lobbyId)
              .eq('user_id', userId)
              .single();
            
            if (existing) {
              roomPlayer.isReady = existing.is_ready === true;
              console.log(`🔄 Player ${roomPlayer.username} rejoined - synced ready: ${roomPlayer.isReady}`);
            }
          } catch (dbError) {
            // Ignore database errors for guests
            console.log(`ℹ️ Could not sync ready status from DB (likely guest user)`);
          }
        }
        
        // Only notify others if player was actually disconnected
        if (wasDisconnected) {
          io.to(lobbyId).emit('player_reconnected', {
            userId: userId,
            username: roomPlayer.username
          });
          console.log(`🔄 Player ${userId} reconnected to lobby ${lobbyId}`);
        } else {
          console.log(`✅ Player ${userId} rejoined lobby ${lobbyId} (was already connected)`);
        }
      } else {
        // Add new player
        // Use selected_avatar for all users (no Discord distinction)
        let avatarUrl = profile.selected_avatar || null;
        
        roomManager.addPlayerToRoom(lobbyId, {
          socketId: socket.id,
          userId: profile.id,
          username: profile.username,
          avatar: avatarUrl,
          isGuest: profile.isGuest || false
        });

        // Update database for authenticated users only (guests skip this)
        if (!profile.isGuest && token) {
          try {
            // Check if player already in database
            const { data: existing } = await supabase
              .from('lobby_players')
              .select('*')
              .eq('lobby_id', lobbyId)
              .eq('user_id', userId)
              .single();

            if (existing) {
              // Sync ready status from database
              const player = gameRoom.players.find(p => p.userId === userId);
              if (player) {
                player.isReady = existing.is_ready === true; // Explicitly set boolean
                console.log(`🔄 Synced ready status from DB for ${player.username}: ${player.isReady}`);
              }
            } else {
              await supabase
                .from('lobby_players')
                .insert({
                  lobby_id: lobbyId,
                  user_id: userId,
                  is_ready: false
                });
              // Ensure player in room has isReady = false
              const player = gameRoom.players.find(p => p.userId === userId);
              if (player) {
                player.isReady = false;
              }
            }

            // Update lobby activity
            await supabase.rpc('update_lobby_activity', { lobby_uuid: lobbyId });
          } catch (dbError) {
            // Ignore database errors for guests
            console.log(`ℹ️ Could not update database (likely guest user):`, dbError.message);
          }
        } else {
          // For guests, ensure isReady is false initially
          const player = gameRoom.players.find(p => p.userId === userId);
          if (player && player.isReady === undefined) {
            player.isReady = false;
          }
        }

        // Notify others
        io.to(lobbyId).emit('player_joined', {
          userId: profile.id,
          username: profile.username,
          avatar: profile.selected_avatar || null
        });
      }

      // Send success response
      socket.emit('lobby_joined', { success: true });

      // Send current room state to all players (including reconnecting player)
      const roomState = roomManager.getRoomState(lobbyId);
      if (roomState) {
        // Send full state to joining player immediately
        socket.emit('room_state', roomState);
        // Also broadcast to all players
        io.to(lobbyId).emit('room_state', roomState);
        
        // If game is in progress and player just joined, emit round_start for them
        if (hasActiveGame && roomState.phase === 'submission') {
          const room = roomManager.getRoom(lobbyId);
          if (room) {
            socket.emit('round_start', {
              roundNumber: room.roundNumber,
              timeRemaining: room.timeRemaining,
              activeRules: room.activeRules,
              players: roomState.players
            });
          }
        }
        
        console.log(`📊 Sent room state to ${lobbyId} - Players:`, roomState.players.map(p => ({ username: p.username, isReady: p.isReady, isConnected: p.isConnected })));
      }

    } catch (error) {
      console.error('Error joining lobby:', error);
      socket.emit('error', { message: 'Failed to join lobby' });
    }
  });

  // Leave lobby
  socket.on('leave_lobby', async (data) => {
    try {
      const { lobbyId, userId, isGuest } = data;
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo || userInfo.lobbyId !== lobbyId) {
        return;
      }

      // Remove player from room
      const player = roomManager.removePlayerFromRoom(lobbyId, socket.id);
      
      if (player) {
        // Remove from database for authenticated users
        if (!isGuest) {
          await supabase
            .from('lobby_players')
            .delete()
            .eq('lobby_id', lobbyId)
            .eq('user_id', userId);

          await supabase.rpc('update_lobby_activity', { lobby_uuid: lobbyId });
        }

        // Notify others
        io.to(lobbyId).emit('player_left', {
          userId: userId,
          username: player.username
        });

        // Send updated room state
        const roomState = roomManager.getRoomState(lobbyId);
        if (roomState) {
          io.to(lobbyId).emit('room_state', roomState);
        }
      }

      socket.leave(lobbyId);
      socketToUser.delete(socket.id);
      userToSocket.delete(userId);
      
      socket.emit('left_lobby', { success: true });
    } catch (error) {
      console.error('Error leaving lobby:', error);
    }
  });

  // Toggle ready status
  socket.on('toggle_ready', async (data) => {
    try {
      const { lobbyId, userId, isReady, isGuest } = data;
      
      if (!lobbyId || !userId || typeof isReady !== 'boolean') {
        socket.emit('error', { message: 'Missing or invalid required fields' });
        return;
      }
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo || userInfo.lobbyId !== lobbyId) {
        socket.emit('error', { message: 'Not in lobby' });
        return;
      }

      const room = roomManager.getRoom(lobbyId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Don't allow ready toggle during active game
      if (room.phase !== 'waiting') {
        socket.emit('error', { message: 'Cannot change ready status during game' });
        return;
      }

      const player = room.players.find(p => p.userId === userId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      // Update ready status
      player.isReady = isReady === true; // Explicitly ensure boolean
      
      console.log(`✅ Updated ready status for ${player.username}: ${isReady}`);

      // Update database for authenticated users
      if (!isGuest) {
        await supabase
          .from('lobby_players')
          .update({ is_ready: isReady })
          .eq('lobby_id', lobbyId)
          .eq('user_id', userId);

        await supabase.rpc('update_lobby_activity', { lobby_uuid: lobbyId });
      }

      // Broadcast ready state change
      io.to(lobbyId).emit('player_ready_changed', { userId, isReady });

      // Send updated room state
      const roomState = roomManager.getRoomState(lobbyId);
      if (roomState) {
        console.log(`📊 Room state after ready toggle - Players:`, roomState.players.map(p => ({ username: p.username, isReady: p.isReady, isConnected: p.isConnected })));
        io.to(lobbyId).emit('room_state', roomState);
      }

    } catch (error) {
      console.error('Error toggling ready:', error);
      socket.emit('error', { message: 'Failed to update ready status' });
    }
  });

  // Start game
  socket.on('start_game', async (data) => {
    try {
      const { lobbyId, userId } = data;
      
      if (!lobbyId || !userId) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      // Verify host
      const { data: lobby } = await supabase
        .from('lobbies')
        .select('host_id')
        .eq('id', lobbyId)
        .single();

      if (!lobby || lobby.host_id !== userId) {
        socket.emit('error', { message: 'Only host can start game' });
        return;
      }

      const room = roomManager.getRoom(lobbyId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if game is already in progress
      if (room.phase !== 'waiting') {
        socket.emit('error', { message: 'Game is already in progress. Please wait for it to finish.' });
        return;
      }

      // Check requirements
      const connectedPlayers = room.players.filter(p => p.isConnected !== false);
      
      if (connectedPlayers.length < 3) {
        socket.emit('error', { message: 'Need at least 3 players to start' });
        return;
      }

      // Check that all connected players are ready
      const allReady = connectedPlayers.length > 0 && connectedPlayers.every(p => p.isReady === true);
      const notReadyPlayers = connectedPlayers.filter(p => p.isReady !== true).map(p => p.username);
      
      console.log(`🎮 Starting game check - Connected players: ${connectedPlayers.length}`);
      console.log(`✅ Ready players:`, connectedPlayers.filter(p => p.isReady === true).map(p => p.username));
      console.log(`❌ Not ready:`, notReadyPlayers);
      
      if (!allReady) {
        socket.emit('error', { 
          message: `All players must be ready. Waiting for: ${notReadyPlayers.join(', ') || 'someone'}` 
        });
        return;
      }

      // Start game
      const result = await roomManager.startGame(lobbyId, io);
      
      if (result.success) {
        io.to(lobbyId).emit('game_starting', { gameId: result.gameId });
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // Submit number choice
  socket.on('submit_number', async (data) => {
    try {
      const { lobbyId, userId, number } = data;
      
      if (!lobbyId || !userId || number === undefined) {
        socket.emit('submission_error', { message: 'Missing required fields' });
        return;
      }

      // Verify user is in the lobby
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo || userInfo.lobbyId !== lobbyId) {
        socket.emit('submission_error', { message: 'Not in lobby' });
        return;
      }
      
      const result = await roomManager.submitChoice(lobbyId, userId, number, io);
      
      if (result.success) {
        socket.emit('submission_confirmed', { success: true });
      } else {
        socket.emit('submission_error', { message: result.error });
      }
    } catch (error) {
      console.error('Error submitting number:', error);
      socket.emit('submission_error', { message: 'Failed to submit' });
    }
  });

  // Send chat message
  socket.on('send_message', async (data) => {
    try {
      const { lobbyId, userId, message, isGuest } = data;
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo || userInfo.lobbyId !== lobbyId) {
        socket.emit('error', { message: 'Not in lobby' });
        return;
      }

      const room = roomManager.getRoom(lobbyId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const player = room.players.find(p => p.userId === userId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      // Save to database for authenticated users
      if (!isGuest) {
        await supabase
          .from('lobby_messages')
          .insert({
            lobby_id: lobbyId,
            user_id: userId,
            message: message
          });
      }

      // Broadcast message
      io.to(lobbyId).emit('new_message', {
        userId: userId,
        username: player.username,
        message: message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎮 BALANCE SCALE - SOCKET.IO SERVER');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Socket.IO: WebSocket + Polling enabled`);
  console.log('='.repeat(60));

  // Start room cleanup service
  roomCleanupService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  roomCleanupService.stop();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
