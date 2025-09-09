import React from "react";

interface MobileFloatingBallProps {
  className?: string;
}

export const MobileFloatingBall: React.FC<MobileFloatingBallProps> = ({
  className = "",
}) => {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Bola flotante verde solo para móviles y tablets pequeñas */}
      <div className="absolute inset-0 md:hidden flex items-center justify-center">
        <div className="relative w-full h-full">
          {/* Bola principal - cruza diagonalmente */}
          <div 
            className="absolute w-40 h-40 bg-[#18cb96] rounded-full opacity-25 blur-xl"
            style={{
              animation: 'crossBall1 20s ease-in-out infinite',
              left: '-10%',
              top: '10%',
            }}
          />
          
          {/* Bola secundaria - cruza horizontalmente */}
          <div 
            className="absolute w-32 h-32 bg-[#15b885] rounded-full opacity-20 blur-lg"
            style={{
              animation: 'crossBall2 25s ease-in-out infinite',
              animationDelay: '3s',
              left: '110%',
              top: '40%',
            }}
          />
          
          {/* Bola terciaria - cruza verticalmente */}
          <div 
            className="absolute w-28 h-28 bg-[#1ae6a8] rounded-full opacity-30 blur-md"
            style={{
              animation: 'crossBall3 22s ease-in-out infinite',
              animationDelay: '6s',
              left: '60%',
              top: '-15%',
            }}
          />
          
          {/* Bola cuarta - movimiento circular */}
          <div 
            className="absolute w-36 h-36 bg-[#18cb96] rounded-full opacity-15 blur-xl"
            style={{
              animation: 'circularBall 30s linear infinite',
              animationDelay: '1s',
              left: '50%',
              top: '50%',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes crossBall1 {
          0% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.1;
          }
          20% {
            transform: translate(30%, 20%) scale(1.1);
            opacity: 0.3;
          }
          40% {
            transform: translate(60%, 40%) scale(0.9);
            opacity: 0.25;
          }
          60% {
            transform: translate(90%, 60%) scale(1.2);
            opacity: 0.35;
          }
          80% {
            transform: translate(120%, 80%) scale(0.7);
            opacity: 0.15;
          }
          100% {
            transform: translate(150%, 100%) scale(0.5);
            opacity: 0.05;
          }
        }
        
        @keyframes crossBall2 {
          0% {
            transform: translate(0, 0) scale(0.6);
            opacity: 0.05;
          }
          15% {
            transform: translate(-20%, 10%) scale(0.9);
            opacity: 0.2;
          }
          30% {
            transform: translate(-40%, 20%) scale(1.1);
            opacity: 0.3;
          }
          45% {
            transform: translate(-60%, 30%) scale(0.8);
            opacity: 0.25;
          }
          60% {
            transform: translate(-80%, 40%) scale(1.0);
            opacity: 0.35;
          }
          75% {
            transform: translate(-100%, 50%) scale(0.7);
            opacity: 0.2;
          }
          90% {
            transform: translate(-120%, 60%) scale(0.5);
            opacity: 0.1;
          }
          100% {
            transform: translate(-140%, 70%) scale(0.3);
            opacity: 0.05;
          }
        }
        
        @keyframes crossBall3 {
          0% {
            transform: translate(0, 0) scale(0.7);
            opacity: 0.1;
          }
          25% {
            transform: translate(-10%, 25%) scale(1.0);
            opacity: 0.3;
          }
          50% {
            transform: translate(-20%, 50%) scale(0.8);
            opacity: 0.25;
          }
          75% {
            transform: translate(-30%, 75%) scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: translate(-40%, 100%) scale(0.6);
            opacity: 0.15;
          }
        }
        
        @keyframes circularBall {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(80px) rotate(0deg) scale(0.8);
            opacity: 0.1;
          }
          25% {
            transform: translate(-50%, -50%) rotate(90deg) translateX(80px) rotate(-90deg) scale(1.1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg) translateX(80px) rotate(-180deg) scale(0.9);
            opacity: 0.25;
          }
          75% {
            transform: translate(-50%, -50%) rotate(270deg) translateX(80px) rotate(-270deg) scale(1.0);
            opacity: 0.35;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(80px) rotate(-360deg) scale(0.8);
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
};
