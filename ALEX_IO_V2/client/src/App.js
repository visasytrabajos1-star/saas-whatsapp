import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Activity, MessageSquare, Settings, Smartphone, Trash2 } from 'lucide-react';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://ygsmooajrqldzdtcukfd.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_X3xx0LH-LOLJf7q5M52yVQ_JUq3AzT8'
);

function App() {
  const [instances, setInstances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    // Mock data for demo - replace with Supabase query
    setInstances([
      { id: 1, name: 'Negocio 1', status: 'online', phone: '+1234567890' },
      { id: 2, name: 'Negocio 2', status: 'offline', phone: '+0987654321' }
    ]);
    setLoading(false);
  };

  const handleConnect = async (name) => {
    setConnecting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/saas/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: name, customPrompt: 'Eres un asistente experto.' })
      });
      const data = await res.json();
      if (data.qr_code) setQrCode(data.qr_code);
    } catch (e) {
      alert('Error connecting: ' + e.message);
    }
    setConnecting(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-500" size={28} />
          <h1 className="text-2xl font-bold tracking-tight">ALEX <span className="text-blue-500">IO</span> V2</h1>
        </div>
        <div className="text-sm text-slate-400">
          Sistema Conversacional Optimizado
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4">Mis Bots</h2>
          <div className="space-y-2">
            {instances.map(inst => (
              <button
                key={inst.id}
                onClick={() => setSelected(inst)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between ${selected?.id === inst.id ? 'bg-blue-600' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                <div>
                  <div className="font-medium">{inst.name}</div>
                  <div className="text-xs text-slate-400">{inst.phone}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${inst.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
              </button>
            ))}
          </div>
          <button 
            onClick={() => handleConnect(`Nuevo Bot ${instances.length + 1}`)}
            className="w-full mt-4 py-2 border border-dashed border-slate-700 text-slate-500 rounded-lg hover:border-blue-500 hover:text-blue-500 transition"
          >
            + Nuevo Bot
          </button>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          {qrCode ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl mb-4">Escanea el QR</h2>
              <img src={qrCode} alt="QR Code" className="border-4 border-white p-2 rounded-lg" />
              <button onClick={() => setQrCode(null)} className="mt-4 text-blue-500">Cancelar</button>
            </div>
          ) : selected ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Config Panel */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-blue-500" /> Configuración
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Nombre del Bot</label>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded p-2" defaultValue={selected.name} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Prompt del Sistema (Personalidad)</label>
                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded p-2 h-32" defaultValue="Eres ALEX IO, un asistente virtual útil y amable." />
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold">Guardar Cambios</button>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-green-500" /> Actividad Reciente
                </h3>
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-slate-900 p-3 rounded border border-slate-800 text-sm">
                      <div className="flex justify-between text-slate-500 text-xs mb-1">
                        <span>Usuario</span>
                        <span>Hace {i * 2} min</span>
                      </div>
                      <p className="text-slate-300">"Quiero información sobre..."</p>
                      <p className="text-blue-400 mt-1 text-xs">Respondido por gemini-flash</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Smartphone size={64} className="mb-4 opacity-20" />
              <p>Selecciona un bot para comenzar</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
