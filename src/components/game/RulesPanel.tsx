import { RULE_DESCRIPTIONS } from '@/types/game';
import { motion } from 'framer-motion';

interface RulesPanelProps {
  activeRules: number[];
  eliminationCount: number;
}

export const RulesPanel = ({ activeRules, eliminationCount }: RulesPanelProps) => {
  return (
    <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg p-4">
      <h3 className="text-xl font-bold text-neon-red mb-4 font-orbitron flex items-center gap-2">
        <span className="text-2xl">📜</span> ACTIVE RULES
      </h3>

      <div className="space-y-3">
        {/* Base Rule */}
        <div className="p-3 border-2 border-neon-cyan rounded bg-neon-cyan/10">
          <div className="text-sm font-bold text-neon-cyan font-orbitron mb-1">BASE RULE</div>
          <div className="text-xs text-foreground font-rajdhani">
            Closest to (Average × 0.8) wins. Others lose 1 point. -10 = ELIMINATED
          </div>
        </div>

        {/* Rule 1 */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: activeRules.includes(1) ? 1 : 0.3 }}
          className={`
            p-3 border-2 rounded transition-all duration-300
            ${activeRules.includes(1) 
              ? 'border-neon-cyan bg-neon-cyan/10' 
              : 'border-border bg-background/50'
            }
          `}
        >
          <div className="flex items-center justify-between mb-1">
            <div className={`
              text-sm font-bold font-orbitron
              ${activeRules.includes(1) ? 'text-neon-cyan' : 'text-muted-foreground'}
            `}>
              RULE 1
            </div>
            {!activeRules.includes(1) && (
              <div className="text-xs text-muted-foreground font-rajdhani">
                Unlocks after 2 eliminations
              </div>
            )}
          </div>
          <div className={`
            text-xs font-rajdhani
            ${activeRules.includes(1) ? 'text-foreground' : 'text-muted-foreground'}
          `}>
            {RULE_DESCRIPTIONS[1]}
          </div>
        </motion.div>

        {/* Rule 2 */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: activeRules.includes(2) ? 1 : 0.3 }}
          className={`
            p-3 border-2 rounded transition-all duration-300
            ${activeRules.includes(2) 
              ? 'border-neon-cyan bg-neon-cyan/10' 
              : 'border-border bg-background/50'
            }
          `}
        >
          <div className="flex items-center justify-between mb-1">
            <div className={`
              text-sm font-bold font-orbitron
              ${activeRules.includes(2) ? 'text-neon-cyan' : 'text-muted-foreground'}
            `}>
              RULE 2
            </div>
            {!activeRules.includes(2) && (
              <div className="text-xs text-muted-foreground font-rajdhani">
                Active with Rule 1
              </div>
            )}
          </div>
          <div className={`
            text-xs font-rajdhani
            ${activeRules.includes(2) ? 'text-foreground' : 'text-muted-foreground'}
          `}>
            {RULE_DESCRIPTIONS[2]}
          </div>
        </motion.div>

        {/* Rule 3 */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: activeRules.includes(3) ? 1 : 0.3 }}
          className={`
            p-3 border-2 rounded transition-all duration-300
            ${activeRules.includes(3) 
              ? 'border-neon-red bg-neon-red/10' 
              : 'border-border bg-background/50'
            }
          `}
        >
          <div className="flex items-center justify-between mb-1">
            <div className={`
              text-sm font-bold font-orbitron
              ${activeRules.includes(3) ? 'text-neon-red' : 'text-muted-foreground'}
            `}>
              RULE 3
            </div>
            {!activeRules.includes(3) && (
              <div className="text-xs text-muted-foreground font-rajdhani">
                Unlocks after 3 eliminations
              </div>
            )}
          </div>
          <div className={`
            text-xs font-rajdhani
            ${activeRules.includes(3) ? 'text-foreground' : 'text-muted-foreground'}
          `}>
            {RULE_DESCRIPTIONS[3]}
          </div>
        </motion.div>

        {/* Elimination Counter */}
        <div className="mt-4 p-3 border-2 border-neon-red rounded bg-neon-red/10">
          <div className="text-sm font-bold text-neon-red font-orbitron mb-1">ELIMINATIONS</div>
          <div className="text-2xl font-bold text-neon-red font-orbitron text-center">
            {eliminationCount}
          </div>
        </div>
      </div>
    </div>
  );
};

