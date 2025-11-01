import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { AVATAR_OPTIONS } from '@/types/game';

const ProfileSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Check if profile is already set up
    checkProfile();
  }, [user, navigate]);

  const checkProfile = async () => {
    try {
      // For guest users, check localStorage
      if ((user as any)?.isGuest) {
        const guestData = localStorage.getItem('guest_user');
        if (guestData) {
          const guest = JSON.parse(guestData);
          if (guest.username) {
            setUsername(guest.username);
          }
          // Guests always need to pick avatar
        }
        setChecking(false);
        return;
      }

      // For authenticated users, check database
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, selected_avatar')
        .eq('id', user!.id)
        .single();

      if (profile?.username && profile?.selected_avatar) {
        // Profile already set up, redirect to lobby browser
        navigate('/lobby-browser');
      } else if (profile?.username) {
        setUsername(profile.username);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast({
        title: 'Username Required',
        description: 'Please enter a username',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedAvatar) {
      toast({
        title: 'Avatar Required',
        description: 'Please select an avatar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Handle guest users
      if ((user as any)?.isGuest) {
        const guestData = localStorage.getItem('guest_user');
        if (guestData) {
          const guest = JSON.parse(guestData);
          guest.username = username.trim();
          guest.selected_avatar = selectedAvatar;
          localStorage.setItem('guest_user', JSON.stringify(guest));
        }

        toast({
          title: 'Profile Set',
          description: 'Your guest profile is ready'
        });

        navigate('/lobby-browser');
        setLoading(false);
        return;
      }

      // Handle authenticated users
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          selected_avatar: selectedAvatar
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been set up successfully'
      });

      navigate('/lobby-browser');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-neon-red text-2xl font-orbitron animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background opacity-50" />
        <div className="absolute top-1/4 right-1/4 text-6xl text-primary opacity-10 animate-float">♦</div>
        <div className="absolute bottom-1/4 left-1/4 text-5xl text-secondary opacity-10 animate-float" style={{ animationDelay: '1s' }}>♦</div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 animate-fade-in-up">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-4xl text-primary animate-pulse">♦</span>
                <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-orbitron tracking-wider">
                  SETUP PROFILE
                </h1>
                <span className="text-4xl text-secondary animate-pulse" style={{ animationDelay: '0.5s' }}>♦</span>
              </div>
              <p className="text-lg text-muted-foreground font-rajdhani">
                Choose your identity for the battle
              </p>
            </div>

            {/* Username Input */}
            <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-8 hover:border-primary transition-all duration-300">
                <label className="block text-xl font-bold text-neon-cyan mb-4 font-orbitron">
                  USERNAME
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  maxLength={20}
                  className="text-xl h-14 bg-background border-2 border-border focus:border-primary font-rajdhani text-foreground"
                />
                <p className="mt-2 text-sm text-muted-foreground font-rajdhani">
                  {username.length}/20 characters
                </p>
              </div>
            </div>

            {/* Avatar Selection */}
            <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-8 hover:border-secondary transition-all duration-300">
                <label className="block text-xl font-bold text-neon-cyan mb-6 font-orbitron">
                  SELECT AVATAR
                </label>
                <div className="grid grid-cols-4 md:grid-cols-4 gap-4">
                  {AVATAR_OPTIONS.map((avatar, index) => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`
                        relative aspect-square border-4 rounded-lg overflow-hidden transition-all duration-300
                        hover:scale-105 hover:shadow-neon-cyan
                        ${selectedAvatar === avatar 
                          ? 'border-neon-cyan shadow-neon-cyan scale-105' 
                          : 'border-border hover:border-neon-cyan/50'
                        }
                      `}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Placeholder for avatar image */}
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <div className="text-4xl font-bold font-orbitron text-foreground/50">
                          {index + 1}
                        </div>
                      </div>
                      {/* Note: Replace with actual images */}
                      {/* <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" /> */}
                      
                      {selectedAvatar === avatar && (
                        <div className="absolute inset-0 bg-neon-cyan/20 flex items-center justify-center">
                          <div className="text-4xl text-neon-cyan">✓</div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground font-rajdhani text-center">
                  Choose an avatar that represents you in battle
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <Button
                onClick={handleSave}
                disabled={loading || !username.trim() || !selectedAvatar}
                size="lg"
                className="text-xl px-16 py-8 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red transition-all duration-300 hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] hover:scale-105 font-orbitron font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SAVING...' : 'ENTER THE ARENA'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProfileSetup;

