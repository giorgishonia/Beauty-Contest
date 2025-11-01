import { Player } from '@/types/game';
import { motion } from 'framer-motion';
import { Lock, X, WifiOff } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PlayerCardProps {
  player: Player;
  isWinner?: boolean;
  scoreChange?: number;
  showChoice?: boolean;
}

export const PlayerCard = ({ player, isWinner, scoreChange, showChoice }: PlayerCardProps) => {
  const isDisconnected = player.isConnected === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative border-4 rounded-lg p-4 transition-all duration-500
        ${isWinner 
          ? 'border-neon-cyan shadow-[0_0_40px_hsl(180_100%_50%/0.8)] bg-neon-cyan/10' 
          : player.isEliminated
          ? 'border-border/30 grayscale opacity-50'
          : isDisconnected
          ? 'border-yellow-500/50 opacity-75'
          : 'border-border bg-card/50'
        }
      `}
    >
      {/* Disconnection indicator */}
      {isDisconnected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-1">
            <WifiOff className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-yellow-500 font-rajdhani font-semibold">OFFLINE</span>
          </div>
        </div>
      )}

      {/* Elimination overlay */}
      {player.isEliminated && (
        <div className="absolute inset-0 bg-neon-red/20 flex items-center justify-center rounded-lg z-10">
          <X className="w-16 h-16 text-neon-red" strokeWidth={4} />
        </div>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <Avatar className={`
          w-24 h-24 rounded-lg border-2 overflow-hidden
          ${isWinner ? 'border-neon-cyan' : 'border-border'}
        `}>
          <AvatarImage 
            src={player.avatar || undefined} 
            alt={player.username}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-3xl font-bold font-orbitron text-foreground/70">
            {player.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Username */}
        <div className={`
          text-lg font-bold font-rajdhani text-center
          ${isWinner ? 'text-neon-cyan' : 'text-foreground'}
        `}>
          {player.username}
        </div>

        {/* Choice display */}
        {showChoice && player.currentChoice !== null && player.currentChoice !== undefined && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold font-orbitron text-neon-red bg-background/80 px-4 py-2 rounded border-2 border-neon-red"
          >
            {player.currentChoice}
          </motion.div>
        )}

        {/* Submitted indicator */}
        {player.hasSubmitted && !showChoice && (
          <div className="flex items-center gap-1 text-neon-cyan text-sm font-rajdhani">
            <Lock className="w-4 h-4" />
            <span>LOCKED</span>
          </div>
        )}

        {/* Score */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-sm text-muted-foreground font-rajdhani">SCORE</div>
          <div className={`
            text-3xl font-bold font-orbitron
            ${player.score >= 0 ? 'text-neon-cyan' : 'text-neon-red'}
          `}>
            {player.score > 0 && '+'}{player.score}
          </div>
        </div>

        {/* Score change animation */}
        {scoreChange !== undefined && scoreChange !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`
              text-2xl font-bold font-orbitron absolute -top-2 right-2
              ${scoreChange > 0 ? 'text-neon-cyan' : 'text-neon-red'}
            `}
          >
            {scoreChange > 0 ? '+' : ''}{scoreChange}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
