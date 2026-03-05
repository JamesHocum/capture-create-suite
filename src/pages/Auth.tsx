import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Camera, Video } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background flex scanlines cyber-grid relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-neon-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-neon-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-neon-cyan/5 rounded-full blur-[80px] animate-neon-pulse pointer-events-none" style={{ animationDelay: '0.8s' }} />

      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
        <div className="relative z-10 text-center space-y-8">
          <div className="flex items-center justify-center gap-3">
            <Monitor className="h-12 w-12 text-primary neon-text" />
            <h1 className="text-5xl font-bold text-primary neon-text tracking-widest uppercase">
              ScreenCraft
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-md font-light tracking-wide">
            Capture, annotate, and record your screen with professional-grade tools — right in your browser.
          </p>
          <div className="flex gap-8 justify-center text-muted-foreground">
            <div className="flex items-center gap-2 group">
              <Camera className="h-5 w-5 text-primary group-hover:neon-text transition-all" />
              <span className="uppercase text-sm tracking-wider">Screenshots</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Video className="h-5 w-5 text-accent group-hover:neon-text transition-all" />
              <span className="uppercase text-sm tracking-wider">Recordings</span>
            </div>
          </div>
          {/* Decorative line */}
          <div className="mx-auto w-48 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent neon-glow" />
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-md cyber-card backdrop-blur-sm bg-card/90">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-4">
              <Monitor className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold text-primary neon-text uppercase tracking-widest">ScreenCraft</span>
            </div>
            <CardTitle className="text-xl uppercase tracking-wider">{isLogin ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription className="tracking-wide">
              {isLogin ? "Sign in to access your captures" : "Start capturing for free"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="uppercase text-xs tracking-wider">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    required={!isLogin}
                    className="border-border/50 focus:border-primary/60 bg-background/50"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="uppercase text-xs tracking-wider">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="border-border/50 focus:border-primary/60 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="uppercase text-xs tracking-wider">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="border-border/50 focus:border-primary/60 bg-background/50"
                />
              </div>
              <Button type="submit" className="w-full neon-btn uppercase tracking-widest font-semibold" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium uppercase tracking-wider"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
