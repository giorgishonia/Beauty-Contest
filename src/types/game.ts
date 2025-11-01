// Game type definitions

export interface Player {
  userId: string;
  username: string;
  avatar: string | null;
  score: number;
  isEliminated: boolean;
  hasSubmitted: boolean;
  currentChoice?: number;
  isConnected?: boolean;
}

export interface RoundChoice {
  number: number;
  userId: string;
  username: string;
}

export interface RoundResult {
  choices: RoundChoice[];
  average: number;
  winningNumber: number;
  winnerId: string;
}

export interface ScoreUpdate {
  scoreChange: number;
  newScore: number;
}

export interface ScoreUpdates {
  [userId: string]: ScoreUpdate;
}

export interface RoundHistory {
  roundNumber: number;
  choices: RoundChoice[];
  winner: string;
  average: number;
  winningNumber: number;
}

export interface GameState {
  lobbyId: string;
  gameId: string | null;
  roundNumber: number;
  phase: 'waiting' | 'submission' | 'reveal' | 'scoring' | 'finished';
  activeRules: number[];
  timeRemaining: number;
  players: Player[];
  roundHistory: RoundHistory[];
  currentChoice: number | null;
  hasSubmitted: boolean;
}

export interface Standing {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  score: number;
  isEliminated: boolean;
}

export interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface LobbyData {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  roundTimer: number;
  password: string | null;
  status: 'waiting' | 'in_progress' | 'finished';
}

export interface LobbyPlayer {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  isReady: boolean;
  joinedAt: string;
  isConnected?: boolean;
}

// Socket event types
export type SocketEvents = {
  // Client to Server
  join_lobby: (data: { lobbyId: string; userId: string; token: string }) => void;
  leave_lobby: (data: { lobbyId: string; userId: string }) => void;
  start_game: (data: { lobbyId: string; userId: string }) => void;
  submit_number: (data: { lobbyId: string; userId: string; number: number }) => void;
  send_message: (data: { lobbyId: string; userId: string; message: string }) => void;
  toggle_ready: (data: { lobbyId: string; userId: string; isReady: boolean }) => void;

  // Server to Client
  lobby_joined: (data: { success: boolean; reconnected?: boolean; roomState?: any }) => void;
  room_state: (state: GameState) => void;
  player_joined: (data: { userId: string; username: string; avatar: string | null }) => void;
  player_left: (data: { userId: string; username: string }) => void;
  player_ready_changed: (data: { userId: string; isReady: boolean }) => void;
  game_starting: (data: { gameId: string }) => void;
  round_start: (data: { roundNumber: number; timeRemaining: number; activeRules: number[]; players: Player[] }) => void;
  timer_update: (data: { timeRemaining: number }) => void;
  player_submitted: (data: { userId: string; username: string }) => void;
  submission_confirmed: (data: { success: boolean }) => void;
  submission_error: (data: { message: string }) => void;
  round_reveal: (data: RoundResult) => void;
  round_scored: (data: { scoreUpdates: ScoreUpdates; eliminatedPlayers: any[]; newRulesUnlocked: number[] }) => void;
  game_over: (data: { standings: Standing[] }) => void;
  new_message: (message: ChatMessage) => void;
  left_lobby: (data: { success: boolean }) => void;
  error: (data: { message: string }) => void;
};

export const RULE_DESCRIPTIONS = {
  1: 'Duplicate numbers become invalid',
  2: 'Exact match with target doubles penalty to -2',
  3: 'If anyone chooses 0, player choosing 100 wins'
};

export const AVATAR_OPTIONS = [
  '/avatars/fox.png',
  '/avatars/cat.png',
  '/avatars/wolf.png',
  '/avatars/character1.png',
  '/avatars/character2.png',
  '/avatars/character3.png',
  '/avatars/character4.png',
  '/avatars/character5.png'
];

