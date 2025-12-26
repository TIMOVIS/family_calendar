
import React from 'react';
import { FamilyMember } from '../types';
import { Sparkles, Crown, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  members: FamilyMember[];
  onLogin: (member: FamilyMember) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ members, onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-5xl w-full border border-white/20 animate-fade-in-up relative overflow-hidden">
        
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="text-center mb-12 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
               <span className="text-5xl">🏡</span>
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-3 drop-shadow-md">fam.ly</h1>
          <p className="text-indigo-100 text-xl sm:text-2xl font-medium opacity-90">Who is checking in today?</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 justify-center relative z-10">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => onLogin(member)}
              className="group flex flex-col items-center gap-4 transition-all hover:-translate-y-2 outline-none focus:outline-none"
            >
              <div className="relative">
                {/* Avatar Container */}
                <div 
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center text-6xl sm:text-7xl border-4 transition-all duration-300 shadow-lg relative overflow-hidden bg-${member.color}-100
                    ${member.isAdmin 
                      ? 'border-yellow-300 shadow-yellow-500/30 group-hover:shadow-yellow-500/50' 
                      : 'border-white/30 group-hover:border-white shadow-black/20'
                    }
                  `}
                >
                   <span className="z-10 transform group-hover:scale-110 transition-transform duration-300">{member.avatar}</span>
                   
                   {/* Hover Overlay */}
                   <div className={`absolute inset-0 bg-${member.color}-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                </div>

                {/* Admin Badge */}
                {member.isAdmin && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-2 shadow-lg border-2 border-white z-20 animate-bounce-subtle" title="Family Manager">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                )}
              </div>

              {/* Name Label */}
              <div className="flex flex-col items-center">
                <span className={`font-bold text-lg sm:text-xl tracking-wide transition-colors duration-300 ${member.isAdmin ? 'text-yellow-200' : 'text-white group-hover:text-white/90'}`}>
                  {member.name}
                </span>
                {member.isAdmin && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-400/80 mt-1">
                    Family Admin
                  </span>
                )}
              </div>
            </button>
          ))}
          
          {members.length === 0 && (
             <div className="col-span-full text-center text-white/70 bg-white/5 rounded-xl p-6 border border-white/10">
                <p>No family members found.</p>
                <p className="text-sm mt-2">Please initialize the app settings.</p>
             </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-white/50 text-sm font-medium flex items-center gap-2 animate-pulse">
         <Sparkles className="w-4 h-4" />
         Powered by fam.ly AI
      </div>
    </div>
  );
};

export default LoginScreen;
