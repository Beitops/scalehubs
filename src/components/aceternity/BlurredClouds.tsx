import React from "react";

interface BlurredCloudsProps {
  className?: string;
}

export const BlurredClouds: React.FC<BlurredCloudsProps> = ({
  className = "",
}) => {
  return (
    <div className={`absolute inset-0 left-30 ${className}`}>
      {/* Nubes borrosas animadas detrás del contenido - solo en desktop y tablet */}
      <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Contenedor centrado para las nubes - mismo tamaño que el formulario */}
          <div className="relative w-full max-w-md h-auto flex items-center justify-center" style={{ transform: 'translateX(-20px)' }}>
        {/* Nube principal - más grande y centrada detrás del formulario */}
        <div 
          className="absolute w-[800px] h-[800px] md:w-[700px] md:h-[700px] lg:w-[800px] lg:h-[800px] bg-[#18cb96] rounded-full opacity-20 blur-3xl"
          style={{
            animation: 'floatMain 6s ease-in-out infinite',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Nube secundaria - más pequeña y desplazada */}
        <div 
          className="absolute w-[700px] h-[700px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] bg-[#15b885] rounded-full opacity-15 blur-2xl"
          style={{
            animation: 'floatSecondary 8s ease-in-out infinite',
            animationDelay: '1s',
            left: '48%',
            top: '52%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Nube terciaria - aún más pequeña */}
        <div 
          className="absolute w-[600px] h-[600px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-[#1ae6a8] rounded-full opacity-25 blur-xl"
          style={{
            animation: 'floatTertiary 10s ease-in-out infinite',
            animationDelay: '2s',
            left: '52%',
            top: '48%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Nube adicional para más dinamismo */}
        <div 
          className="absolute w-[750px] h-[750px] md:w-[650px] md:h-[650px] lg:w-[750px] lg:h-[750px] bg-[#18cb96] rounded-full opacity-10 blur-2xl"
          style={{
            animation: 'floatAdditional 7s ease-in-out infinite',
            animationDelay: '3s',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatMain {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1) translate(0, 0);
            opacity: 0.2;
          }
          25% {
            transform: translate(-50%, -50%) scale(1.05) translate(15px, -10px);
            opacity: 0.25;
          }
          50% {
            transform: translate(-50%, -50%) scale(0.95) translate(-10px, 15px);
            opacity: 0.22;
          }
          75% {
            transform: translate(-50%, -50%) scale(1.02) translate(8px, 5px);
            opacity: 0.28;
          }
        }
        
        @keyframes floatSecondary {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1) translate(0, 0);
            opacity: 0.15;
          }
          33% {
            transform: translate(-50%, -50%) scale(1.08) translate(-20px, -15px);
            opacity: 0.2;
          }
          66% {
            transform: translate(-50%, -50%) scale(0.92) translate(12px, 20px);
            opacity: 0.18;
          }
        }
        
        @keyframes floatTertiary {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1) translate(0, 0);
            opacity: 0.25;
          }
          40% {
            transform: translate(-50%, -50%) scale(1.1) translate(18px, -12px);
            opacity: 0.3;
          }
          80% {
            transform: translate(-50%, -50%) scale(0.9) translate(-15px, 18px);
            opacity: 0.22;
          }
        }
        
        @keyframes floatAdditional {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1) translate(0, 0);
            opacity: 0.1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.06) translate(-12px, -18px);
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
};
