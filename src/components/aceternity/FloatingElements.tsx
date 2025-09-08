import React, { useEffect, useState } from "react";

interface FloatingElementsProps {
  children?: React.ReactNode;
  className?: string;
  elementCount?: number;
  elementSize?: number;
  elementColors?: string[];
  animationDuration?: number;
  animationDelay?: number;
}

export const FloatingElements: React.FC<FloatingElementsProps> = ({
  children,
  className = "",
  elementCount = 3,
  elementSize = 200,
  elementColors = ["#18cb96", "#15b885", "#1ae6a8"],
  animationDuration = 8,
  animationDelay = 0,
}) => {
  const [elements, setElements] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    animationDelay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    const newElements = Array.from({ length: elementCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: elementSize + Math.random() * 100,
      color: elementColors[i % elementColors.length],
      animationDelay: animationDelay + i * 2,
      duration: animationDuration + Math.random() * 4,
    }));
    setElements(newElements);
  }, [elementCount, elementSize, elementColors, animationDuration, animationDelay]);

  return (
    <div className={`relative ${className}`}>
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {elements.map((element) => (
          <div
            key={element.id}
            className="absolute rounded-full opacity-20 blur-3xl animate-pulse"
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              width: `${element.size}px`,
              height: `${element.size}px`,
              backgroundColor: element.color,
              animation: `float ${element.duration}s ease-in-out infinite`,
              animationDelay: `${element.animationDelay}s`,
            }}
          />
        ))}
      </div>
      
      {/* Children */}
      <div className="relative z-10">
        {children}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          25% {
            transform: translate(20px, -30px) scale(1.1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-15px, -20px) scale(0.9);
            opacity: 0.25;
          }
          75% {
            transform: translate(30px, 10px) scale(1.05);
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
};
