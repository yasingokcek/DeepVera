import React, { useState, useEffect, useRef } from 'react';
import { extractLeadList, findCompanyIntel, sleep } from './services/geminiService';
import { Participant, ViewState, User, AppStatus } from './types';
import Header from './components/Header';
import DataTable from './components/DataTable';
import LandingPage from './components/LandingPage';
import LoginForm from './components/LoginForm';
import PaymentModal from './components/PaymentModal';
import CompanyDetail from './components/CompanyDetail';
import AdminPanel from './components/AdminPanel';
import IdentityModal from './components/IdentityModal';
import { supabase } from './services/supabaseClient';

const SECTORS = [
  { id: 'tech', label: 'Yazılım/Bilişim', icon: '💻' },
  { id: 'restaurant', label: 'Restoran/Gıda', icon: '🍽️' },
  { id: 'market', label: 'Market/Perakende', icon: '🛒' },
  { id: 'hotel', label: 'Otel/Konaklama', icon: '🏨' },
  { id: 'factory', label: 'İmalat/Sanayi', icon: '🏭' },
  { id: 'hospital', label: 'Sağlık/Medikal', icon: '🏥' },
  { id: 'edu', label: 'Eğitim/Okul', icon: '🎓' },
  { id: 'logistics', label: 'Lojistik/Kargo', icon: '🚚' },
  { id: 'cons', label: 'İnşaat/Emlak', icon: '🏗️' },
  { id: 'beauty', label: 'Güzellik/Kozmetik', icon: '💄' },
  ];

const CITIES = ["Tüm Türkiye", "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Global"];

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<ViewState>('landing');
    const [tokenBalance, setTokenBalance] = useState<number>(1500);
    const [participants, setParticipants] = useState<Participant[]>(() => {
          const saved = localStorage.getItem('deepvera_leads_cache');
          return saved ? JSON.parse(saved) : [];
    });
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [selectedSector, setSelectedSector] = useState<string>('tech');
    const [selectedCity, setSelectedCity] = useState<string>('İstanbul');
    const [queryContext, setQueryContext] = useState<string>('');
    const [leadLimit] = useState<number>(20);
    const [isAutopilot, setIsAutopilot] = useState<boolean>(false);
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [logs, setLogs] = useState<string[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
    const stopAnalysisRef = useRef(false);

    // Supabase Auth: oturum durumunu dinle
    useEffect(() => {
          // Mevcut oturumu kontrol et
                  supabase.auth.getSession().then(({ data: { session } }) => {
                          if (session?.user) {
                                    const supaUser: User = {
                                                id: session.user.id,
                                                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kullanıcı',
                                                email: session.user.email || '',
                                                isPro: false,
                                                companyLogo: session.user.user_metadata?.avatar_url || '',
                                                n8nWebhookUrl: '',
                                                targetAudience: '',
                                                salesStrategy: '',
                                                isGmailConnected: false,
                                                senderAccounts: [],
                                                currentSenderIndex: 0,
                                                globalPitch: '',
                                                emailSignature: '',
                                    };
                                    setUser(supaUser);
                                    setView('dashboard');
                          }
                  });

                  // Oturum değişikliklerini dinle
                  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                          if (session?.user) {
                                    const supaUser: User = {
                                                id: session.user.id,
                                                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kullanıcı',
                                                email: session.user.email || '',
                                                isPro: false,
                                                companyLogo: session.user.user_metadata?.avatar_url || '',
                                                n8nWebhookUrl: '',
                                                targetAudience: '',
                                                salesStrategy: '',
                                                isGmailConnected: false,
                                                senderAccounts: [],
                                                currentSenderIndex: 0,
                                                globalPitch: '',
                                                emailSignature: '',
                                    };
                                    setUser(supaUser);
                                    setView('dashboard');
                          } else {
                                    setUser(null);
                                    setView('landing');
                          }
                  });

                  return () => subscription.unsubscribe();
    }, []);

    // Leads cache'i localStorage'a kaydet
    useEffect(() => {
          localStorage.setItem('deepvera_leads_cache', JSON.stringify(participants));
    }, [participants]);

    const addLog = (msg: string) => setLogs([msg]);

    // TÜRKÇE KARAKTER DESTEKLİ EXCEL EXPORT (BOM EKLEYEREK)
    const exportToExcel = () => {
          if (participants.length === 0) return;
          const headers = ["Firma Adı", "Web Sitesi", "E-Posta", "Telefon", "Sektör", "Konum", "LinkedIn", "Instagram", "Twitter", "Buzkıran", "E-Posta Başlığı", "E-Posta Taslağı"];
          const rows = participants.map(p => [
                  p.name, p.website, p.email, p.phone, p.industry, p.location,
                  p.linkedin || '', p.instagram || '', p.twitter || '',
                  p.icebreaker || '', p.emailSubject || '',
                  (p.emailDraft || '').replace(/\n/g, ' [PARAGRAF] ')
                ]);
          const csvContent = [
                  headers.join(";"),
                  ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(";"))
                ].join("\n");
          const BOM = "\uFEFF";
          const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `DeepVera_Havuz_Raporu_${new Date().toLocaleDateString()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
    };

    const triggerWebhook = async (lead: Participant) => {
          if (!user?.n8nWebhookUrl) return;
          try {
                  await fetch(user.n8nWebhookUrl, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ lead, sender: user })
                  });
                  setParticipants(prev => prev.map(p => p.id === lead.id ? { ...p, automationStatus: 'sent' } : p));
          } catch (e) {
                  console.error("Webhook error", e);
          }
    };

    const startAnalysis = async () => {
          if (tokenBalance < 1) { setIsPaymentModalOpen(true); return; }
          if (isAutopilot && !user?.n8nWebhookUrl) { setIsIdentityModalOpen(true); return; }
          stopAnalysisRef.current = false;
          setStatus(AppStatus.LOADING);
          setLogs(["Hedefler taranıyor..."]);
          try {
                  const sectorLabel = SECTORS.find(s => s.id === selectedSector)?.label;
                  const activeQuery = queryContext.trim() || `${selectedCity} bölgesindeki ${sectorLabel} şirketleri`;
                  const rawResults = await extractLeadList(activeQuery, selectedSector, selectedCity, participants.map(p => p.name), (msg) => addLog(msg));
                  if (!rawResults || rawResults.length === 0) { addLog("Sonuç bulunamadı."); setStatus(AppStatus.IDLE); return; }
                  const initialLeads: Participant[] = rawResults.slice(0, leadLimit).map(r => ({
                            id: `p-${Date.now()}-${Math.random()}`,
                            name: r.name || 'Firma',
                            website: r.website || '',
                            email: 'Aranıyor...',
                            phone: '...',
                            industry: sectorLabel,
                            location: r.location || selectedCity,
                            status: 'pending' as const,
                            automationStatus: 'idle'
                  }));
                  setParticipants(prev => [...initialLeads, ...prev]);
                  setStatus(AppStatus.FINDING_DETAILS);
                  for (let i = 0; i < initialLeads.length; i++) {
                            if (stopAnalysisRef.current) break;
                            const current = initialLeads[i];
                            try {
                                        await sleep(500);
                                        const intel = await findCompanyIntel(current.name, current.website, selectedSector, user!, (msg) => addLog(msg));
                                        const updatedLead = { ...current, ...intel, status: 'completed' as const };
                                        setParticipants(prev => prev.map(p => p.id === current.id ? updatedLead : p));
                                        setTokenBalance(prev => Math.max(0, prev - 1));
                                        if (isAutopilot && updatedLead.email?.includes('@')) {
                                                      await triggerWebhook(updatedLead as Participant);
                                        }
                            } catch (error) {
                                        console.error(error);
                                        setParticipants(prev => prev.map(p => p.id === current.id ? { ...p, status: 'failed' as const } : p));
                            }
                  }
          } catch (err) {
                  console.error(err);
                  addLog("Hata oluştu.");
          }
          setStatus(AppStatus.IDLE);
    };

    const handleLogout = async () => {
          await supabase.auth.signOut();
          setUser(null);
          setView('landing');
    };

    return (
          <div className="h-screen bg-[#f8fafc] flex flex-col overflow-hidden font-sans text-slate-900">
            {view === 'landing' ? (
                    <LandingPage onGetStarted={() => setView('login')} />
                  ) : view === 'login' ? (
                    <LoginForm
                                onLogin={(u) => { setUser(u); setView('dashboard'); }}
                                onCancel={() => setView('landing')}
                              />
                  ) : (
                    <>
                              <header className="h-20 shrink-0 flex items-center px-6 border-b border-slate-100 bg-white sticky top-0 z-[60] shadow-sm">
                                          <div className="flex items-center gap-4 min-w-fit">
                                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-base shadow-lg">DV</div>div>
                                                        <div className="hidden lg:flex flex-col leading-none">
                                                                        <span className="font-black text-base tracking-tighter uppercase">DeepVera <span className="text-blue-600">AI</span>span></span>span>
                                                                        <span className="text-[6px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Intelligence Center</span>span>
                                                        </div>div>
                                          </div>div>
                                          <div className="mx-6 h-8 w-px bg-slate-100 hidden sm:block"></div>div>
                                          <div className="flex-1 flex items-center gap-2 max-w-5xl">
                                                        <div className="flex-1 relative group">
                                                                        <input
                                                                                            type="text"
                                                                                            value={queryContext}
                                                                                            onChange={(e) => setQueryContext(e.target.value)}
                                                                                            placeholder="Hedef URL veya anahtar kelime..."
                                                                                            className="w-full h-11 pl-4 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/30 transition-all shadow-inner"
                                                                                          />
                                                        </div>div>
                                                        <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[9px] font-black uppercase tracking-widest outline-none hover:border-slate-300 transition-all appearance-none cursor-pointer">
                                                          {SECTORS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>option>)}
                                                        </select>select>
                                                        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[9px] font-black uppercase tracking-widest outline-none hover:border-slate-300 transition-all appearance-none cursor-pointer">
                                                          {CITIES.map(c => <option key={c} value={c}>{c}</option>option>)}
                                                        </select>select>
                                                        <button
                                                                          onClick={() => setIsAutopilot(!isAutopilot)}
                                                                          className={`h-11 px-4 rounded-xl border flex items-center gap-2 transition-all ${isAutopilot ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                                                                        >
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${isAutopilot ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`}></div>div>
                                                                        <span className="text-[8px] font-black uppercase tracking-widest">OTONOM</span>span>
                                                        </button>button>
                                            {status === AppStatus.IDLE ? (
                                      <button onClick={startAnalysis} className="h-11 px-6 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-2">🚀 BAŞLAT</button>button>
                                    ) : (
                                      <button onClick={() => { stopAnalysisRef.current = true; setStatus(AppStatus.IDLE); }} className="h-11 px-6 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-100 animate-pulse">⏹️ DURDUR</button>button>
                                                        )}
                                          </div>div>
                                          <div className="mx-6 h-8 w-px bg-slate-100 hidden sm:block"></div>div>
                                          <div className="flex items-center gap-4">
                                                        <div className="flex flex-col items-end leading-none cursor-pointer" onClick={() => setIsPaymentModalOpen(true)}>
                                                                        <span className="text-xs font-black text-blue-600">{tokenBalance}</span>span>
                                                                        <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">CREDITS</span>span>
                                                        </div>div>
                                                        <button onClick={() => setIsIdentityModalOpen(true)} className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-xs grayscale hover:grayscale-0 transition-all">⚙️</button>button>
                                                        <div
                                                                          className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-100 flex items-center justify-center text-white text-[10px] font-black cursor-pointer"
                                                                          onClick={handleLogout}
                                                                        >
                                                          {user?.name?.charAt(0)}
                                                        </div>div>
                                          </div>div>
                              </header>header>
                              <main className="flex-1 flex flex-col overflow-hidden">
                                {status !== AppStatus.IDLE && (
                                    <div className="bg-[#00D1FF] px-8 py-2 flex justify-between items-center shadow-[0_0_20px_rgba(0,209,255,0.3)] z-[55] border-b border-white/20">
                                                    <div className="flex items-center gap-3">
                                                                      <div className="flex gap-1">
                                                                                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>div>
                                                                      </div>div>
                                                                      <span className="text-[9px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md">Global İstihbarat Aktif</span>span>
                                                    </div>div>
                                                    <div className="flex-1 max-w-lg mx-8 h-1 bg-white/30 rounded-full overflow-hidden">
                                                                      <div className="h-full bg-white shadow-[0_0_8px_white] transition-all duration-500" style={{ width: `${(participants.filter(p => p.status === 'completed').length / leadLimit) * 100}%` }}></div>div>
                                                    </div>div>
                                                    <span className="text-[8px] font-black text-white uppercase tracking-widest animate-pulse drop-shadow-sm">{logs[0]}</span>span>
                                    </div>div>
                                          )}
                                          <div className="flex-1 relative max-w-[1400px] mx-auto w-full px-8 py-8 overflow-y-auto no-scrollbar flex flex-col gap-8">
                                                        <DataTable
                                                                          participants={participants}
                                                                          status={status}
                                                                          tokenBalance={tokenBalance}
                                                                          onSelectParticipant={setSelectedParticipant}
                                                                          onExport={exportToExcel}
                                                                          onClear={() => { if(window.confirm("Havuz boşaltılsın mı?")) setParticipants([]); }}
                                                                        />
                                                        <CompanyDetail
                                                                          participant={selectedParticipant}
                                                                          onClose={() => setSelectedParticipant(null)}
                                                                          userLogo={user?.companyLogo}
                                                                          onTriggerAutomation={triggerWebhook}
                                                                        />
                                          </div>div>
                              </main>main>
                              <IdentityModal
                                            isOpen={isIdentityModalOpen}
                                            onClose={() => setIsIdentityModalOpen(false)}
                                            user={user}
                                            onUpdate={(f) => setUser(u => u ? {...u, ...f} : null)}
                                          />
                              <PaymentModal
                                            isOpen={isPaymentModalOpen}
                                            isPro={user?.isPro}
                                            onClose={() => setIsPaymentModalOpen(false)}
                                            onSuccess={(t) => setTokenBalance(b => b + t)}
                                            onUpgrade={() => user && setUser({...user, isPro: true})}
                                          />
                    </>>
                  )}
          </div>div>
        );
};

export default App;</></div>
