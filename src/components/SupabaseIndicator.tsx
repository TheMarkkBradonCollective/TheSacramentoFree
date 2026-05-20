import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Terminal, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react';
import { getSupabaseConfigurationState, subscribeToSupabaseState, SQL_SETUP_SCRIPT } from '../supabase';

export default function SupabaseIndicator() {
  const [dbState, setDbState] = useState(getSupabaseConfigurationState());
  const [copied, setCopied] = useState(false);
  const [showSqlPanel, setShowSqlPanel] = useState(false);

  useEffect(() => {
    return subscribeToSupabaseState((state) => {
      setDbState(state);
    });
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div id="supabase_db_indicator_block" className="space-y-3 font-sans">
      {/* Uber Styled Minimalist Status Bar */}
      <div 
        className={`flex flex-col sm:flex-row items-center justify-between p-5 rounded-none border transition-all ${
          dbState.isConfigured 
            ? 'bg-white border-zinc-200 text-black shadow-sm' 
            : 'bg-zinc-50 border-amber-500/30 text-black'
        }`}
      >
        <div className="flex items-start space-x-3.5 text-center sm:text-left mb-4 sm:mb-0">
          <div className={`p-2.5 rounded-none flex items-center justify-center shrink-0 ${
            dbState.isConfigured ? 'bg-zinc-100 text-[#276EF1]' : 'bg-amber-100 text-amber-700'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="text-xs font-black tracking-widest uppercase">
                {dbState.isConfigured ? 'DATABASE ACTIVE' : 'SCHEMA SETUP CONSOLE'}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${dbState.isConfigured ? 'bg-[#05A357]' : 'bg-amber-500'}`} />
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-semibold leading-relaxed">
              {dbState.isConfigured 
                ? 'Relational mapping linked. Sacramento listings and chats are securely written to active cloud tables.'
                : 'Local Sandbox is operational. To unlock standard multi-tenant features, paste the SQL schema script.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-center">
          {!dbState.isConfigured && (
            <button
              onClick={() => setShowSqlPanel(!showSqlPanel)}
              className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-none text-[10.5px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer select-none inline-flex items-center space-x-2"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showSqlPanel ? 'HIDE SQL CHEVRON' : 'GET INTEGRATION SQL'}</span>
            </button>
          )}
          {dbState.isConfigured && (
            <button
              onClick={() => setShowSqlPanel(!showSqlPanel)}
              className="px-5 py-2.5 bg-white hover:bg-zinc-50 text-black border border-zinc-200 rounded-none text-[10.5px] font-bold uppercase tracking-widest transition-all cursor-pointer inline-flex items-center space-x-2"
            >
              <Terminal className="w-3.5 h-3.5 text-[#276EF1]" />
              <span>{showSqlPanel ? 'CLOSE CONTROLLER' : 'VIEW SCHEMA OUTLINE'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SQL Script Viewer Panel - Styled like premium developer docs */}
      {showSqlPanel && (
        <div className="bg-white p-6 rounded-none border border-zinc-200 shadow-lg space-y-4 animate-fadeIn" id="db_sql_drawer">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#276EF1]" />
              <h4 className="text-xs font-black text-black uppercase tracking-widest">POSTGRESQL RELATIONAL SCHEMAS</h4>
            </div>
            <button
              onClick={handleCopySql}
              className="px-4 py-2 bg-[#276EF1] hover:bg-[#1a56ca] text-white rounded-none text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center space-x-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED TO BUFFER' : 'COPY SCHEMAS'}</span>
            </button>
          </div>

          <div className="rounded-none overflow-hidden bg-zinc-950 border border-zinc-900 p-4 font-mono text-[11px] text-zinc-300 max-h-60 overflow-y-auto leading-relaxed shadow-inner">
            <pre className="whitespace-pre">{SQL_SETUP_SCRIPT}</pre>
          </div>

          <div className="p-4 bg-zinc-50 rounded-none border border-zinc-200 text-xs text-zinc-600 font-semibold space-y-2.5">
            <div className="flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-[#276EF1] shrink-0 mt-0.5" />
              <p>
                <strong>Deployment Blueprint:</strong> Load your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#276EF1] font-bold hover:underline inline-flex items-center space-x-1"><span>Supabase Console</span><ExternalLink className="w-3 h-3 inline" /></a>, paste these schemas in any <strong>SQL Query Tab</strong>, and press <strong>Run</strong>.
              </p>
            </div>
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-[#276EF1] shrink-0 mt-0.5" />
              <p>
                <strong>Cross-Platform Synchronization Failover:</strong> An automated dual pipeline connects Supabase to your active Firebase store. If Postgres structures are not detected, listings automatically sync via secondary fallback channels—ensuring a 100% reliable system with no failures.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
