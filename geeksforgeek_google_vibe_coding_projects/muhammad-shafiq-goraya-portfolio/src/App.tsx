import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  Linkedin, 
  Mail, 
  Terminal, 
  ShieldCheck, 
  Code, 
  Cpu, 
  MessageSquare,
  Send,
  X,
  Award,
  Globe,
  Briefcase,
  GraduationCap,
  ChevronRight,
  Menu,
  ChevronLeft,
  Circle,
  Lock
} from 'lucide-react';
import { chatbotResponse } from './gemini';

// --- Shared Components ---

const LoadingScreen = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.8 }}
    className="fixed inset-0 z-[200] bg-obsidian flex flex-col items-center justify-center"
  >
    <motion.div
      animate={{ 
        scale: [1, 1.2, 1],
        rotate: [0, 180, 360]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="w-16 h-16 border-2 border-cyber-blue rounded-lg mb-6 flex items-center justify-center p-2"
    >
      <div className="w-full h-full bg-cyber-purple/20 rounded"></div>
    </motion.div>
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: 200 }}
      className="h-1 bg-gradient-to-r from-cyber-blue to-cyber-purple rounded-full overflow-hidden"
    >
      <motion.div 
        animate={{ x: [-200, 200] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="h-full w-40 bg-white/40 blur-sm"
      />
    </motion.div>
    <p className="mt-4 text-[10px] mono tracking-[0.3em] text-cyan-500 animate-pulse uppercase">decrypting_portfolio_v2.bin</p>
  </motion.div>
);

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Identity', path: '/', id: '01' },
    { name: 'Projects', path: '/projects', id: '02' },
    { name: 'Experience', path: '/experience', id: '03' },
    { name: 'Contact', path: '/contact', id: '04' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-4 md:px-12 ${isScrolled ? 'bg-obsidian/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center font-bold text-black text-xs transition-transform group-hover:rotate-12">MS</div>
          <div className="flex flex-col">
            <span className="text-xs mono text-cyber-blue leading-none opacity-50">Root_Identity</span>
            <span className="text-sm font-bold tracking-tight text-white uppercase group-hover:text-cyber-blue transition-colors">Goraya</span>
          </div>
        </Link>
        
        <div className="hidden md:flex gap-12 text-[10px] mono uppercase tracking-[0.2em]">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`relative py-1 transition-all hover:text-white ${location.pathname === link.path ? 'text-cyber-blue font-bold' : 'text-slate-500'}`}
            >
               <span className="text-[8px] mr-2 opacity-30">{link.id}.</span> {link.name}
               {location.pathname === link.path && (
                 <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 w-full h-[2px] bg-cyber-blue" />
               )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex items-center gap-2 group cursor-pointer border border-white/5 bg-white/5 px-3 py-1.5 rounded-full transition-all hover:bg-white/10 hover:border-cyber-blue/50">
             <div className="h-1.5 w-1.5 rounded-full bg-cyber-blue shadow-[0_0_8px_#00f2ff]"></div>
             <span className="text-[10px] mono opacity-50 group-hover:opacity-100">Status: Secure</span>
           </div>
           <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white p-1">
             {isMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-0 top-0 left-0 w-full h-screen bg-obsidian z-[-1] flex flex-col items-center justify-center gap-8"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                onClick={() => setIsMenuOpen(false)}
                className="text-4xl font-extrabold uppercase tracking-tighter hover:text-cyber-blue transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="min-h-screen pt-24"
  >
    {children}
  </motion.div>
);

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: "SYSTEM_INITIALIZED: Agent MS-SEC-V2 ready for query. How can I assist you with Muhammad's security profile?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    const response = await chatbotResponse(userMsg, messages);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsLoading(false);
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-[100]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-gradient-to-tr from-cyber-blue to-cyber-purple rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.4)] cursor-pointer hover:scale-110 transition-transform text-black group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {isOpen ? <X /> : <MessageSquare />}
          {!isOpen && <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-4 border-obsidian rounded-full"></div>}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
            className="fixed bottom-28 right-8 w-full max-w-[400px] h-[550px] glass-luxury rounded-3xl flex flex-col z-[100] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-cyber-blue/10 flex items-center justify-center text-cyber-blue">
                  <Cpu size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">Agent MS-SEC-V2</h4>
                  <p className="text-[9px] mono text-cyber-blue opacity-50 uppercase">Neural_Interface_Live</p>
                </div>
              </div>
              <X className="w-5 h-5 text-zinc-500 cursor-pointer hover:text-white transition-colors" onClick={() => setIsOpen(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-cyber-blue text-black font-medium rounded-tr-none' : 'glass-card text-zinc-300 border border-white/10 rounded-tl-none'}`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                   <div className="glass-card p-4 rounded-2xl flex gap-1">
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-cyber-blue rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-cyber-blue rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-cyber-blue rounded-full" />
                   </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 glass-luxury">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Execute query..."
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyber-blue transition-all"
                />
                <button onClick={handleSend} className="p-3 bg-cyber-blue text-black rounded-xl hover:bg-cyber-purple hover:text-white transition-all shadow-lg">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Pages ---

const HomePage = () => {
  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center min-h-[80vh]">
        <motion.div
           initial={{ opacity: 0, x: -50 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-cyber-blue"></div>
            <span className="text-[10px] mono text-cyber-blue uppercase tracking-[0.4em]">Available_For_Hiring</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white leading-tight mb-8 tracking-tighter uppercase">
            MUHAMMAD <br /> 
            <span className="text-gradient-premium">SHAFIQ GORAYA</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed mb-10 max-w-xl">
             Software Engineering Student <span className="text-white">@GCUF</span>. 
             Cybersecurity Enthusiast and AI Developer focusing on high-integrity security architectures.
          </p>

          <div className="flex flex-wrap gap-6 mb-12">
             <Link to="/projects" className="group px-10 py-5 bg-white text-black font-bold uppercase text-xs tracking-widest rounded-full hover:bg-cyber-blue transition-all flex items-center gap-3">
               Explore Arsenal <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
             </Link>
             <Link to="/contact" className="group px-10 py-5 bg-white/5 border border-white/10 text-white font-bold uppercase text-xs tracking-widest rounded-full hover:bg-white/10 transition-all flex items-center gap-3">
               Connect_Link
             </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 opacity-40">
             {[
               { icon: Github, label: "GitHub", href: "https://github.com/Goraya0999" },
               { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/in/muhammad-shafiq-goraya-3bb183377" },
               { icon: Terminal, label: "THM", href: "https://tryhackme.com/p/Goraya000" },
               { icon: Globe, label: "HTB", href: "https://app.hackthebox.com/users/2890561" },
             ].map((s, i) => (
               <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                 <s.icon size={16} />
                 <span className="text-[10px] mono uppercase">{s.label}</span>
               </a>
             ))}
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 1, delay: 0.2 }}
           className="relative flex justify-center"
        >
          <div className="relative w-full max-w-[500px] aspect-square">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyber-blue/20 to-cyber-purple/20 blur-[120px] rounded-full animate-glow"></div>
            <div className="absolute -inset-10 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]"></div>
            <div className="absolute -inset-20 border border-white/2 rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
            
            <div className="absolute inset-0 flex items-center justify-center p-8">
               <div className="w-full h-full glass-luxury rounded-[100px] overflow-hidden border border-white/10 group relative p-4">
                  <div className="w-full h-full rounded-[80px] overflow-hidden">
                    <img 
                      src="src/profile.png" 
                      alt="Muhammad Shafiq Goraya" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top group-hover:scale-110 transition-all duration-1000 ease-out" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60"></div>
                  </div>
               </div>
            </div>

            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 pointer-events-none"
            >
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 glass-luxury rounded-xl flex items-center justify-center text-cyber-blue -rotate-[360deg]">
                 <ShieldCheck size={20} />
               </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10 mt-12 overflow-hidden">
         <div className="flex flex-wrap gap-12 font-bold uppercase tracking-[0.4em] text-[10px] opacity-40 whitespace-nowrap animate-[marquee_30s_linear_infinite]">
            <span>Kali_Linux</span> <Circle size={4} className="fill-white" />
            <span>AI_Security</span> <Circle size={4} className="fill-white" />
            <span>Python_Automation</span> <Circle size={4} className="fill-white" />
            <span>Ethical_Hacking</span> <Circle size={4} className="fill-white" />
            <span>Cloud_Infrastructure</span> <Circle size={4} className="fill-white" />
            <span>Fast_API</span> <Circle size={4} className="fill-white" />
            <span>CTF_Expertise</span> <Circle size={4} className="fill-white" />
            <span>Kali_Linux</span> <Circle size={4} className="fill-white" />
            <span>AI_Security</span> <Circle size={4} className="fill-white" />
         </div>
      </div>
    </PageTransition>
  );
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects);
  }, []);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-20">
          <span className="text-[10px] mono text-cyber-purple uppercase tracking-[0.5em] mb-4 block">Archive_Viper.03</span>
          <h2 className="text-6xl font-black text-white uppercase tracking-tighter">PROJECT_ARSENAL</h2>
          <div className="h-1 w-40 bg-gradient-to-r from-cyber-purple to-transparent mt-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {projects.map((proj, i) => (
             <motion.div
               key={proj.id}
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               className="h-full"
             >
               <div className="glass-card p-10 group relative overflow-hidden transition-all hover:-translate-y-2 h-full flex flex-col">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl font-black pointer-events-none">{i + 1}</div>
                 
                 <div className="flex justify-between items-start mb-8">
                    <span className="text-[9px] mono text-cyber-blue px-2 py-1 border border-cyber-blue/30 rounded uppercase tracking-widest">{proj.category}</span>
                    <a href={proj.github} target="_blank" rel="noopener noreferrer" className="p-3 glass-luxury rounded-xl hover:text-cyber-blue transition-colors">
                      <Github size={20} />
                    </a>
                 </div>

                 <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4 group-hover:text-cyber-blue transition-colors">
                   {proj.title.replace(/-/g, ' ')}
                 </h3>
                 
                 <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
                   {proj.description}
                 </p>

                 <div className="flex flex-wrap gap-2 mt-auto">
                    {proj.tech.map((t: string) => (
                      <span key={t} className="text-[9px] mono uppercase bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity">{t}</span>
                    ))}
                 </div>
               </div>
             </motion.div>
           ))}
        </div>
      </div>
    </PageTransition>
  );
};

const ExperiencePage = () => {
  const experiences = [
    {
      title: "CyberOps Associate",
      org: "Cisco Certification",
      status: "Verified",
      date: "2024",
      icon: ShieldCheck,
      color: "from-blue-500 to-cyan-500",
      link: "https://www.credly.com/badges/f3c0b475-f37c-44d2-9fe1-0c9d1d3cd529/public_url"
    },
    {
      title: "Google Cybersecurity Professional",
      org: "Coursera / Google",
      status: "Completed",
      date: "2024",
      icon: Award,
      color: "from-blue-600 to-indigo-600",
      link: "https://www.credly.com/badges/7c990671-35d8-4d9b-8470-c7ff6626e68a/public_url"
    },
    {
      title: "KCNA Course",
      org: "Cloud Native Computing Foundation",
      status: "In Progress",
      date: "2024",
      icon: Cpu,
      color: "from-emerald-500 to-teal-500",
      link: "https://www.credly.com/badges/7f2f93f7-7880-41b3-bdc0-8b2d698582df/public_url"
    },
    {
       title: "Certified SME Security Officer",
       org: "ICTTF Organization",
       status: "Verified",
       date: "2024",
       icon: Lock,
       color: "from-amber-500 to-orange-500"
    }
  ];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
             <div className="mb-16">
                <span className="text-[10px] mono text-cyber-blue uppercase tracking-[0.5em] mb-4 block">Mission_Logs</span>
                <h2 className="text-6xl font-black text-white uppercase tracking-tighter">EXPERIENCE</h2>
             </div>

             <div className="space-y-12">
                <div className="relative pl-12 border-l border-white/10 pb-8">
                   <div className="absolute top-0 left-[-8px] w-4 h-4 bg-cyber-blue rounded-full shadow-[0_0_20px_#00f2ff]"></div>
                   <div className="glass-card p-8 hover:bg-white/[0.04] transition-all">
                      <div className="flex justify-between items-start mb-4">
                         <h3 className="text-2xl font-bold text-white uppercase">Cybersecurity Intern</h3>
                         <span className="text-[10px] mono text-cyber-blue uppercase tracking-widest bg-cyber-blue/10 px-3 py-1 rounded-full">Money Mitra Network</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Active participation in vulnerability assessments, security reporting, and practical security awareness tasks. Specialized in network security fundamentals and web application protection.
                      </p>
                      <div className="flex flex-wrap gap-2 text-[9px] mono uppercase opacity-50 font-bold">
                        <span>#Network_Security</span>
                        <span>#Vuln_Assessment</span>
                        <span>#OWASP_T10</span>
                      </div>
                   </div>
                </div>

                <div className="relative pl-12 border-l border-white/5">
                   <div className="absolute top-0 left-[-8px] w-4 h-4 bg-slate-800 rounded-full"></div>
                   <div className="glass-luxury p-8 opacity-60">
                      <h3 className="text-xl font-bold text-white uppercase">Volleyball Team Captain</h3>
                      <p className="text-[10px] mono text-cyber-purple tracking-widest mt-1 uppercase">Leadership_Extracurricular</p>
                      <p className="text-slate-400 text-sm mt-4 italic">
                        Leading teams in competitive environments, fostering strategy, agility, and high-performance collaboration.
                      </p>
                   </div>
                </div>
             </div>

             <div className="mt-24">
                <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-12 flex items-center gap-4">
                   <GraduationCap className="text-cyber-blue" /> Education_History
                </h3>
                <div className="glass-luxury p-10 border-l-8 border-l-cyber-blue">
                   <span className="text-[10px] mono text-cyber-blue uppercase tracking-widest mb-2 block">Present // GCU Faisalabad</span>
                   <h4 className="text-2xl font-bold text-white uppercase tracking-tight">BS Software Engineering</h4>
                   <p className="text-slate-400 mt-2">Class of 2027 • Focus: Cybersecurity & AI Development</p>
                   
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-10">
                      {['Operating Systems', 'Networking', 'Data Structures', 'Database Systems', 'Software Design', 'Stat Theory'].map(s => (
                        <div key={s} className="flex items-center gap-3 text-[10px] mono text-slate-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue"></div>
                          {s}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-8">
             <h3 className="text-sm font-bold text-cyber-purple uppercase tracking-[0.3em] mb-12 px-2 border-l-2 border-cyber-purple">Verified_Credentials</h3>
             <div className="grid gap-6">
                {experiences.map((cert, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="glass-luxury p-6 group transition-all"
                  >
                    <div className="flex items-center gap-4 mb-4">
                       <div className={`p-3 rounded-xl bg-gradient-to-br ${cert.color} text-white shadow-xl`}>
                          <cert.icon size={18} />
                       </div>
                       <div>
                          <h4 className="text-xs font-bold text-white uppercase leading-tight group-hover:text-cyber-blue transition-colors tracking-tight">{cert.title}</h4>
                          <p className="text-[9px] mono text-slate-500 uppercase tracking-widest mt-1">{cert.org}</p>
                       </div>
                    </div>
                    <div className="flex justify-between items-center mt-6">
                       <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cert.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyber-blue/10 text-cyber-blue'}`}>
                         {cert.status}
                       </span>
                       {cert.link && (
                         <a href={cert.link} target="_blank" rel="noopener noreferrer" className="text-[9px] mono text-cyber-purple hover:text-cyber-blue underline">View_Auth</a>
                       )}
                    </div>
                  </motion.div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const ContactPage = () => {
  const [status, setStatus] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('ESTABLISHING_SECURE_LINK...');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setStatus(data.message);
    } catch {
      setStatus('ERROR: CONNECTION_REJECTED');
    }
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
        <div className="text-center mb-24">
           <span className="text-[10px] mono text-cyber-blue uppercase tracking-[0.5em] mb-4 block">Uplink_Node.04</span>
           <h2 className="text-7xl font-black text-white uppercase tracking-tighter">SECURE_CONTACT</h2>
           <p className="text-slate-400 mt-6 max-w-xl mx-auto text-lg leading-relaxed">
             Encrypted communication for internships, collaborations, and cybersecurity research opportunities.
           </p>
        </div>

        <div className="w-full grid md:grid-cols-5 gap-12 items-start">
           <div className="md:col-span-2 space-y-6">
              {[
                { icon: Mail, label: "Secure Email", text: "muhmmadshafiq0417@gmail.com", href: "mailto:muhmmadshafiq0417@gmail.com" },
                { icon: Linkedin, label: "Neural Network", text: "Shafiq Goraya", href: "https://linkedin.com/in/muhammad-shafiq-goraya-3bb183377" },
                { icon: Github, label: "Public Keys", text: "Goraya0999", href: "https://github.com/Goraya0999" },
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="block p-8 glass-luxury hover:bg-white/[0.05] transition-all group border-l-4 border-l-transparent hover:border-l-cyber-blue">
                   <div className="flex items-center gap-5">
                      <div className="p-3 bg-white/5 rounded-xl text-cyber-blue group-hover:scale-110 transition-transform">
                        <s.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] mono text-slate-500 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">{s.text}</p>
                      </div>
                   </div>
                </a>
              ))}
           </div>

           <div className="md:col-span-3 h-full">
              <div className="glass-card p-12 h-full">
                 <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                       <div>
                          <label className="text-[10px] mono uppercase text-slate-500 mb-2 block tracking-widest">Identify_User</label>
                          <input required name="name" type="text" placeholder="Your Name" className="w-full bg-white/5 border-b border-white/10 px-0 py-4 text-white focus:outline-none focus:border-cyber-blue transition-colors text-sm" />
                       </div>
                       <div>
                          <label className="text-[10px] mono uppercase text-slate-500 mb-2 block tracking-widest">Return_Address</label>
                          <input required name="email" type="email" placeholder="Your_Email@host.com" className="w-full bg-white/5 border-b border-white/10 px-0 py-4 text-white focus:outline-none focus:border-cyber-blue transition-colors text-sm" />
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] mono uppercase text-slate-500 mb-2 block tracking-widest">Message_Payload</label>
                       <textarea required name="message" rows={4} placeholder="Describe the mission scope..." className="w-full bg-white/5 border-b border-white/10 px-0 py-4 text-white focus:outline-none focus:border-cyber-blue transition-colors text-sm resize-none"></textarea>
                    </div>

                    <button type="submit" className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-cyber-blue transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3">
                      ESTABLISH_CONNECTION <Send size={16} />
                    </button>

                    {status && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-center">
                         <span className="text-[10px] mono text-cyber-blue font-bold uppercase">{status}</span>
                      </motion.div>
                    )}
                 </form>
              </div>
           </div>
        </div>
      </div>
    </PageTransition>
  );
};

// --- Footer ---

const Footer = () => (
  <footer className="py-24 px-6 border-t border-white/5 glass-luxury mt-24">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
      <div>
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center font-bold text-black text-xs">MS</div>
            <span className="text-xl font-bold tracking-tighter text-white uppercase">Goraya_Archive</span>
         </div>
         <p className="text-slate-500 text-sm max-w-xs leading-relaxed uppercase tracking-tight">
            Leading-edge cybersecurity research and AI development. Built for high-integrity missions.
         </p>
      </div>

      <div className="flex gap-20">
         <div className="flex flex-col gap-3">
            <p className="text-[10px] mono text-white font-bold opacity-30 uppercase tracking-widest mb-2">Systems</p>
            <Link to="/" className="text-xs hover:text-cyber-blue transition-colors uppercase">Identity</Link>
            <Link to="/projects" className="text-xs hover:text-cyber-blue transition-colors uppercase">Projects</Link>
            <Link to="/experience" className="text-xs hover:text-cyber-blue transition-colors uppercase">Experience</Link>
         </div>
         <div className="flex flex-col gap-3">
            <p className="text-[10px] mono text-white font-bold opacity-30 uppercase tracking-widest mb-2">Uplinks</p>
            <a href="https://github.com/Goraya0999" className="text-xs hover:text-cyber-blue transition-colors uppercase">GitHub</a>
            <a href="https://linkedin.com/in/muhammad-shafiq-goraya-3bb183377" className="text-xs hover:text-cyber-blue transition-colors uppercase">LinkedIn</a>
            <a href="#" className="text-xs hover:text-cyber-blue transition-colors uppercase">Resume_PDF</a>
         </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-24 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] mono text-slate-600 uppercase tracking-[0.4em]">
       <span>© 2026 Muhammad Shafiq Goraya // SEC_PROTO: V2.1</span>
       <span className="flex items-center gap-2">
         <div className="w-1 h-1 bg-cyber-blue rounded-full shadow-[0_0_5px_#00f2ff]"></div>
         Neural_Interface_Secured
       </span>
    </div>
  </footer>
);

// --- Main App ---

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loading" />}
      </AnimatePresence>
      
      {!isLoading && (
        <div className="selection:bg-cyber-blue/30 selection:text-cyber-blue min-h-screen flex flex-col">
          <Navbar />
          <AnimatePresence mode="wait">
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/experience" element={<ExperiencePage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </AnimatePresence>
          <Footer />
          <Chatbot />
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
