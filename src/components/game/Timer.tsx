import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface TimerProps {
  timeRemaining: number;
  roundTimer: number;
}

export const Timer = ({ timeRemaining, roundTimer }: TimerProps) => {
  const percentage = (timeRemaining / roundTimer) * 100;
  const isLow = timeRemaining <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-3 px-6 py-3 rounded-lg border-2 transition-all duration-300
        ${isLow 
          ? 'border-neon-red bg-neon-red/20 animate-pulse' 
          : 'border-neon-cyan bg-card/50'
        }
      `}
    >
      <Clock className={`w-6 h-6 ${isLow ? 'text-neon-red' : 'text-neon-cyan'}`} />
      <div>
        <div className="text-xs text-muted-foreground font-rajdhani">TIME LEFT</div>
        <div className={`
          text-4xl font-bold font-orbitron
          ${isLow ? 'text-neon-red' : 'text-neon-cyan'}
        `}>
          {timeRemaining > 0 ? `00:${String(timeRemaining).padStart(2, '0')}` : '00:00'}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="ml-4 w-32 h-2 bg-background rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'linear' }}
          className={`h-full ${isLow ? 'bg-neon-red' : 'bg-neon-cyan'}`}
        />
      </div>
    </motion.div>
  );
};

