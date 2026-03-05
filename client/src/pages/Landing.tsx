import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Waves, Anchor, Footprints } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";
import allianceLogo from "@assets/2D8435ED-5485-402E-88AA-FD17A14FF73E_1772670220046.png";
import atlantisBg from "@/assets/images/atlantis-bg.png";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${atlantisBg})` }}
        data-testid="img-landing-bg"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-[#030810]/80 via-[#050A14]/60 to-[#030810]/90" />

      <div className="absolute inset-0 bg-gradient-to-t from-[#030810] via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#030810] to-transparent" />

      <nav className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src={allianceLogo}
            alt="Atlantis Alliance Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
            data-testid="img-alliance-logo"
          />
          <span className="font-display font-bold text-base sm:text-xl tracking-wider text-cyan-400">ATLANTIS ARCHIVES</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.open("https://discord.gg/BA3TY4AAPf", "_blank")}
            className="text-white border-[#5865F2]/50 bg-[#5865F2]/20 backdrop-blur-sm hover:shadow-[0_0_25px_0px_rgba(88,101,242,0.5)] transition-all duration-300 text-sm sm:text-base"
            data-testid="button-discord-server"
          >
            <SiDiscord className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Discord Server</span>
            <span className="sm:hidden">Discord</span>
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-white/10 backdrop-blur-md mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-medium text-cyan-300/90 tracking-wide uppercase">System Online</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-white mb-4 sm:mb-6 drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
            <span className="block text-gradient-ocean">Atlantis</span>
            <span className="block text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-blue-100/70 mt-1 sm:mt-2 font-serif italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">From the Depths, We Rise</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-blue-100/60 font-light leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] px-2">
            Welcome to the Atlantis Archives! Click the "Login with Discord" button below to get started. Any alliance or P&W information can be found here.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-6 sm:pt-8 w-full px-2">
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-semibold bg-[#5865F2] text-white border-[#5865F2] shadow-[0_0_20px_-5px_rgba(88,101,242,0.4)] hover:shadow-[0_0_35px_0px_rgba(88,101,242,0.7)] transition-all duration-300 w-full sm:w-auto"
              data-testid="button-enter-archive"
            >
              <SiDiscord className="mr-2 w-5 h-5" />
              Login with Discord <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg border-white/20 text-white backdrop-blur-sm bg-white/5 shadow-[0_0_15px_-5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_0px_rgba(6,182,212,0.4)] transition-all duration-300 w-full sm:w-auto"
              onClick={() => window.open("https://politicsandwar.com", "_blank")}
              data-testid="button-alliance-portal"
            >
              Alliance Portal
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-24 w-full max-w-4xl px-2"
        >
          {[
            { icon: Waves, title: "Deep Intel", desc: "Secure operational data storage" },
            { icon: Anchor, title: "History", desc: "Preserving our legacy and lore" },
            { icon: Footprints, title: "Onboarding", desc: "First steps into Atlantis" },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md hover:bg-black/40 transition-colors">
              <feature.icon className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="font-display font-semibold text-lg text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-blue-200/50">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-white/30">
        <p>&copy; {new Date().getFullYear()} Atlantis Alliance. Secure connection established.</p>
      </footer>
    </div>
  );
}
