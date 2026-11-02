"use client";
import React, { useState } from "react";
import { 
  MdArrowBack, 
  MdLockOutline, 
  MdChevronRight, 
  MdVisibilityOff, 
  MdVisibility,
  MdDescription,
  MdVpnKey,
  MdSend,
  MdCreditCard,
  MdQrCodeScanner,
  MdLaptopMac,
  MdTrackChanges,
  MdHome
} from "react-icons/md";

export default function BancolombiaDashboard() {
  const [hideBalances, setHideBalances] = useState(false);

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans antialiased selection:bg-yellow-400 selection:text-black">
      
      {/* --- HEADER PRINCIPAL --- */}
      <header className="px-5 pt-6 pb-2 max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="text-xl text-slate-200 hover:opacity-80 transition" aria-label="Volver">
            <MdArrowBack />
          </button>
          <div>
            <h2 className="text-xs text-slate-400 font-medium tracking-wide">22 de Mayo de 2026</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">19:34</p>
          </div>
        </div>
        <button className="text-xl text-slate-400 hover:text-white transition" aria-label="Seguridad">
          <MdLockOutline />
        </button>
      </header>

      {/* --- SECCIÓN HERO (BIENVENIDA + CLAVE DINÁMICA) --- */}
      <section className="relative overflow-hidden max-w-lg mx-auto px-5 pt-4 pb-6">
        {/* Curvas decorativas de fondo alusivas al branding */}
        <div className="absolute top-2 right-[-20px] w-56 h-32 pointer-events-none opacity-80">
          <svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M20 90C70 40 140 30 210 50" stroke="#00C9A7" strokeWidth="8" strokeLinecap="round"/>
            <path d="M40 95C90 25 160 15 230 45" stroke="#FF8066" strokeWidth="6" strokeLinecap="round"/>
            <path d="M60 100C110 10 180 5 250 40" stroke="#FFC72C" strokeWidth="10" strokeLinecap="round"/>
            <path d="M80 105C130 -5 200 -5 270 35" stroke="#845EC2" strokeWidth="5" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="flex items-center gap-1.5 text-2xl font-light tracking-wide text-slate-100 mb-5 relative z-10">
          <span>Hola, Jhonatan</span>
          <MdChevronRight className="text-yellow-400 text-3xl mt-0.5" />
        </div>

        {/* Píldora de Clave Dinámica */}
        <div className="inline-flex items-center bg-[#262626] border border-zinc-800/60 rounded-full pl-2 pr-4 py-1.5 shadow-lg relative z-10 backdrop-blur-sm max-w-full">
          <div className="relative w-9 h-9 rounded-full bg-zinc-700/60 flex items-center justify-center text-slate-300 overflow-hidden">
            {/* Anillo de progreso simulado */}
            <div className="absolute inset-0 border-[2.5px] border-yellow-500/80 rounded-full border-r-transparent border-b-transparent animate-spin [animation-duration:15s]"></div>
            <MdLockOutline className="text-sm text-zinc-300 relative z-10" />
          </div>
          <div className="ml-3 mr-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Clave Dinámica</p>
            <p className="text-base font-bold text-slate-200 tracking-widest mt-0.5">561 794</p>
          </div>
          <MdChevronRight className="text-zinc-500 text-xl" />
        </div>
      </section>

      {/* --- SECCIÓN CUENTAS (SLIDER SIMULADO) --- */}
      <section className="max-w-lg mx-auto px-5 py-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-200 tracking-wide">Tus cuentas</h3>
          <button 
            onClick={() => setHideBalances(!hideBalances)}
            className="text-xs font-semibold text-slate-300 underline underline-offset-4 decoration-zinc-600 flex items-center gap-1.5 hover:text-white transition"
          >
            {hideBalances ? (
              <><MdVisibility className="text-sm text-slate-400" /> Mostrar saldos</>
            ) : (
              <><MdVisibilityOff className="text-sm text-slate-400" /> Ocultar saldos</>
            )}
          </button>
        </div>

        {/* Tarjeta de Cuenta de Ahorros */}
        <div className="bg-[#1C1C1E] border border-zinc-800/40 rounded-2xl p-5 shadow-xl relative overflow-hidden transition hover:border-zinc-700/60">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-base font-medium text-slate-200">Cuenta de Ahorros</h4>
              <p className="text-xs text-zinc-500 mt-1">Ahorros 556 - 860389 - 97</p>
            </div>
            <MdChevronRight className="text-zinc-500 text-2xl mt-0.5" />
          </div>

          <div className="text-right mt-6 mb-5">
            <p className="text-[11px] text-zinc-400 font-medium">Saldo disponible</p>
            <p className="text-2xl font-light text-slate-100 tracking-tight mt-1">
              {hideBalances ? (
                <span className="tracking-widest font-bold">••••••</span>
              ) : (
                <>
                  <span className="text-xl mr-1 font-normal text-slate-300">$</span>
                  130.791,<span className="text-sm font-normal text-slate-400">84</span>
                </>
              )}
            </p>
          </div>

          {/* Botón Amarillo Característico */}
          <button className="w-full bg-[#FFD100] text-black font-semibold text-[13px] py-2.5 rounded-full shadow-md hover:bg-[#e6bd00] transition duration-200 active:scale-[0.99]">
            Conoce más de tu cuenta
          </button>
        </div>

        {/* Indicadores de carrusel (Paginación) */}
        <div className="flex justify-center items-center gap-1.5 mt-4">
          <span className="w-7 h-1.5 bg-[#FFD100] rounded-full"></span>
          <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full"></span>
        </div>
      </section>

      {/* --- TRANSACCIONES PRINCIPALES (GRID) --- */}
      <section className="max-w-lg mx-auto px-5 py-5">
        <h3 className="text-base font-medium text-slate-300 tracking-wide mb-3">Transacciones principales</h3>
        
        <div className="grid grid-cols-4 gap-2.5">
          {/* Item 1 */}
          <button className="bg-[#1C1C1E] rounded-xl p-3 flex flex-col items-center justify-between min-h-[96px] text-center border border-transparent hover:border-zinc-800 transition active:scale-95">
            <MdDescription className="text-2xl text-slate-300" />
            <span className="text-[10px] leading-tight text-slate-400 font-medium mt-2">Ver saldos y movimientos</span>
          </button>

          {/* Item 2 */}
          <button className="bg-[#1C1C1E] rounded-xl p-3 flex flex-col items-center justify-between min-h-[96px] text-center border border-transparent hover:border-zinc-800 transition active:scale-95">
            <div className="text-xs font-black text-slate-200 tracking-tighter border border-zinc-700 px-1 rounded-sm">Bre-B</div>
            <span className="text-[10px] leading-tight text-slate-400 font-medium mt-2">Tus llaves</span>
          </button>

          {/* Item 3 */}
          <button className="bg-[#1C1C1E] rounded-xl p-3 flex flex-col items-center justify-between min-h-[96px] text-center border border-transparent hover:border-zinc-800 transition active:scale-95 relative ring-1 ring-zinc-800/50">
            <div className="relative">
              <MdSend className="text-2xl text-slate-300 -rotate-45" />
              {/* Símbolo de pesos pequeño arriba a la derecha */}
              <span className="absolute -top-1 -right-1.5 text-[9px] font-bold text-slate-300">$</span>
            </div>
            <span className="text-[10px] leading-tight text-slate-400 font-medium mt-2">Transferir plata</span>
            {/* Efecto de toque simulado en la imagen */}
            <span className="absolute bottom-5 right-2 w-4 h-4 bg-white/20 rounded-full blur-xs"></span>
          </button>

          {/* Item 4 */}
          <button className="bg-[#1C1C1E] rounded-xl p-3 flex flex-col items-center justify-between min-h-[96px] text-center border border-transparent hover:border-zinc-800 transition active:scale-95">
            <MdCreditCard className="text-2xl text-slate-300" />
            <span className="text-[10px] leading-tight text-slate-400 font-medium mt-2">Pagar tarjetas y créditos</span>
          </button>
        </div>
      </section>

      {/* --- MÁS OPCIONES (CÍRCULOS DE COLORES) --- */}
      <section className="max-w-lg mx-auto px-5 py-2 mb-20">
        <h3 className="text-base font-medium text-slate-300 tracking-wide mb-4">Más opciones</h3>
        
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {/* Opción 1: Rosa */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button className="w-16 h-16 rounded-full bg-[#F5C3C8] text-zinc-800 flex items-center justify-center text-2xl shadow-md hover:opacity-90 transition">
              <MdLaptopMac />
            </button>
          </div>

          {/* Opción 2: Lila */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button className="w-16 h-16 rounded-full bg-[#C3B3DB] text-zinc-800 flex items-center justify-center text-2xl shadow-md hover:opacity-90 transition">
              <MdTrackChanges />
            </button>
          </div>

          {/* Opción 3: Verde Mentolado */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button className="w-16 h-16 rounded-full bg-[#82E0C4] text-zinc-800 flex items-center justify-center text-2xl shadow-md hover:opacity-90 transition">
              <MdHome />
            </button>
          </div>

          {/* Opción 4: QR Flotante Destacado (Amarillo con borde) */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0 relative">
            <button className="w-16 h-16 rounded-full bg-[#262626] text-[#FFD100] flex items-center justify-center text-3xl shadow-lg border border-zinc-800 ring-4 ring-[#FFD100] hover:bg-zinc-800 transition">
              <MdQrCodeScanner />
            </button>
          </div>
        </div>
      </section>

      {/* --- BARRA DE NAVEGACIÓN INFERIOR (ESTILO ANDROID) --- */}
      <footer className="fixed bottom-0 inset-x-0 bg-black border-t border-zinc-900/60 py-3 px-10 flex items-center justify-between text-slate-400 z-50 max-w-lg mx-auto">
        <button className="hover:text-white transition text-lg" aria-label="Volumen">
          <span className="block w-5 h-4 border-2 border-current rounded-xs relative">
            <span className="absolute inset-y-0 left-1 w-0.5 bg-current"></span>
          </span>
        </button>
        <button className="hover:text-white transition text-lg tracking-widest font-light" aria-label="Home">
          ||
        </button>
        <button className="hover:text-white transition text-xl" aria-label="Menú">
          <span className="block w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
            <span className="w-1 h-1 bg-current rounded-full"></span>
          </span>
        </button>
      </footer>

    </div>
  );
}