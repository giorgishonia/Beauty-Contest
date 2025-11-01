import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';

interface NumberSelectorProps {
  onSubmit: (number: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const NumberSelector = ({ onSubmit, disabled = false, min = 0, max = 100 }: NumberSelectorProps) => {
  const [selectedNumber, setSelectedNumber] = useState(50);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = () => {
    setIsConfirming(true);
    setTimeout(() => {
      onSubmit(selectedNumber);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-card/70 backdrop-blur-sm border-4 border-neon-cyan rounded-lg p-8 shadow-[0_0_40px_hsl(180_100%_50%/0.3)]">
        {/* Selected Number Display */}
        <div className="text-center mb-8">
          <div className="text-sm text-neon-cyan font-rajdhani mb-2">SELECTED NUMBER</div>
          <motion.div
            key={selectedNumber}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-8xl font-bold font-orbitron text-neon-red mb-2"
            style={{ 
              textShadow: '0 0 30px hsl(348 100% 50% / 0.6)',
              filter: isConfirming ? 'blur(2px)' : 'none'
            }}
          >
            {selectedNumber}
          </motion.div>
          <div className="text-xs text-muted-foreground font-rajdhani">
            Range: {min} - {max}
          </div>
        </div>

        {/* Slider */}
        <div className="mb-8">
          <Slider
            value={[selectedNumber]}
            onValueChange={(value) => setSelectedNumber(value[0])}
            min={min}
            max={max}
            step={1}
            disabled={disabled || isConfirming}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground font-rajdhani">
            <span>{min}</span>
            <span>{Math.floor((min + max) / 2)}</span>
            <span>{max}</span>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[0, 25, 50, 75, 100].map((num) => (
            <Button
              key={num}
              onClick={() => setSelectedNumber(num)}
              disabled={disabled || isConfirming}
              variant="outline"
              className="border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/20 font-orbitron"
            >
              {num}
            </Button>
          ))}
        </div>

        {/* Lock In Button */}
        <Button
          onClick={handleSubmit}
          disabled={disabled || isConfirming}
          size="lg"
          className="w-full text-2xl py-8 bg-neon-red hover:bg-neon-red/90 text-white border-4 border-neon-red shadow-[0_0_40px_hsl(348_100%_50%/0.6)] font-orbitron font-bold tracking-wider transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirming ? 'LOCKING IN...' : 'LOCK IN'}
        </Button>
      </div>
    </motion.div>
  );
};

