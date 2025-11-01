import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SocketProvider } from "@/contexts/SocketContext";
import Landing from "./pages/Landing";
import LobbyBrowser from "./pages/LobbyBrowser";
import ProfileSetup from "./pages/ProfileSetup";
import CreateLobby from "./pages/CreateLobby";
import LobbyWaitingRoom from "./pages/LobbyWaitingRoom";
import GameRoom from "./pages/GameRoom";
import VictoryScreen from "./pages/VictoryScreen";
import StatsDashboard from "./pages/StatsDashboard";
import StrategyTutorial from "./pages/StrategyTutorial";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/lobby-browser" element={<LobbyBrowser />} />
              <Route path="/create-lobby" element={<CreateLobby />} />
              <Route path="/lobby/:lobbyId" element={<LobbyWaitingRoom />} />
              <Route path="/game/:lobbyId" element={<GameRoom />} />
              <Route path="/victory/:lobbyId" element={<VictoryScreen />} />
              <Route path="/stats" element={<StatsDashboard />} />
              <Route path="/tutorial" element={<StrategyTutorial />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
