import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Waves, Anchor, Footprints } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";
import allianceLogo from "@assets/BA10968C-16F4-46FB-979A-0295F2AAEEBC_1770762350945.JPEG";

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
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#050A14]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[100px]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-teal-900/10 blur-[80px]" />
      </div>

      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <img
            src={allianceLogo}
            alt="Atlantis Alliance Logo"
            className="w-10 h-10 rounded-lg object-cover"
            data-testid="img-alliance-logo"
          />
          <span className="font-display font-bold text-xl tracking-wider text-foreground">ATLANTIS</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.open("https://discord.gg/BA3TY4AAPf", "_blank")}
            className="text-foreground border-[#5865F2]/40 bg-[#5865F2]/10"
            data-testid="button-discord-server"
          >
            <SiDiscord className="w-4 h-4 mr-2" />
            Discord Server
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary/80 tracking-wide uppercase">System Online</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-white mb-6">
            <span className="block text-gradient-ocean">Atlantis</span>
            <span className="block text-4xl md:text-5xl lg:text-6xl text-muted-foreground mt-2 font-serif italic">From the Depths, We Rise</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
            Welcome to the Atlantis Archives! Click the "Login with Discord" button below to get started. Any alliance or P&W information can be found here.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="h-14 px-8 rounded-full text-lg font-semibold bg-[#5865F2] text-white border-[#5865F2] shadow-[0_0_30px_-5px_rgba(88,101,242,0.4)] transition-all"
              data-testid="button-enter-archive"
            >
              <SiDiscord className="mr-2 w-5 h-5" />
              Login with Discord <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 rounded-full text-lg border-white/10 text-foreground"
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
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-4xl"
        >
          {[
            { icon: Waves, title: "Deep Intel", desc: "Secure operational data storage" },
            { icon: Anchor, title: "History", desc: "Preserving our legacy and lore" },
            { icon: Footprints, title: "Onboarding", desc: "First steps into Atlantis" },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground/40">
        <p>&copy; {new Date().getFullYear()} Atlantis Alliance. Secure connection established.</p>
      </footer>
    </div>
  );
}
