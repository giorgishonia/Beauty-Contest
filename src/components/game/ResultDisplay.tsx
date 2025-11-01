import { motion } from 'framer-motion';

interface ResultDisplayProps {
  average: number;
  winningNumber: number;
  show: boolean;
}

export const ResultDisplay = ({ average, winningNumber, show }: ResultDisplayProps) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="bg-card/80 backdrop-blur-sm border-4 border-neon-cyan rounded-lg p-8 shadow-[0_0_60px_hsl(180_100%_50%/0.5)]">
        {/* Average */}
        <div className="text-center mb-6">
          <div className="text-lg text-neon-cyan font-rajdhani mb-2">AVERAGE</div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-6xl font-bold font-orbitron text-foreground"
            style={{ textShadow: '0 0 20px hsl(180 100% 50% / 0.4)' }}
          >
            {average.toFixed(2)}
          </motion.div>
        </div>

        {/* Multiplication Symbol */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="text-5xl text-neon-red font-orbitron"
          >
            × 0.8
          </motion.div>
        </div>

        {/* Winning Number */}
        <div className="text-center">
          <div className="text-xl text-neon-red font-rajdhani mb-4">
            答え / ANSWER
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, type: 'spring', stiffness: 200 }}
            className="text-9xl font-bold font-orbitron text-neon-cyan"
            style={{ 
              textShadow: '0 0 50px hsl(180 100% 50% / 0.8)',
              letterSpacing: '0.1em'
            }}
          >
            {winningNumber.toFixed(2)}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

