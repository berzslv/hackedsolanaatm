import { Link } from 'wouter';
import { useState } from 'react';
import WhitepaperDialog from '@/components/WhitepaperDialog';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showWhitepaper, setShowWhitepaper] = useState(false);

  // Smooth scroll function
  const scrollToElement = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <footer className="bg-[#0f0b19] border-t border-gray-800 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#1a1525] flex items-center justify-center">
                <i className="ri-bank-fill text-[#6366f1] text-xl"></i>
              </div>
              <div>
                <span className="text-white font-bold">Hacked<span className="text-[#6366f1]">ATM</span></span>
                <div className="text-[10px] -mt-1 text-teal-400">DEVNET MODE</div>
              </div>
            </Link>
            <p className="text-gray-400 text-sm">
              A revolutionary Solana token with built-in referral system and staking rewards.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-[#6366f1]"><i className="ri-twitter-x-line text-xl"></i></a>
              <a href="#" className="text-gray-400 hover:text-[#6366f1]"><i className="ri-telegram-line text-xl"></i></a>
              <a href="#" className="text-gray-400 hover:text-[#6366f1]"><i className="ri-discord-line text-xl"></i></a>
              <a href="#" className="text-gray-400 hover:text-[#6366f1]"><i className="ri-medium-line text-xl"></i></a>
            </div>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#home" 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToElement('home');
                  }}
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToElement('about');
                  }}
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="#staking" 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToElement('staking');
                  }}
                >
                  Staking
                </a>
              </li>
              <li>
                <a 
                  href="#referral" 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToElement('referral');
                  }}
                >
                  Referral
                </a>
              </li>
              <li>
                <a 
                  href="#leaderboard" 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToElement('leaderboard');
                  }}
                >
                  Leaderboard
                </a>
              </li>
              <li>
                <a 
                  href="#faq" 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToElement('faq');
                  }}
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setShowWhitepaper(true)} 
                  className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm text-left"
                >
                  Whitepaper
                </button>
                <WhitepaperDialog open={showWhitepaper} onOpenChange={setShowWhitepaper} />
              </li>
              <li><a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Smart Contract</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Token Metrics</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Audit Reports</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-white font-semibold mb-4">Subscribe</h3>
            <p className="text-gray-400 text-sm mb-4">
              Stay updated with the latest news and announcements.
            </p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Your email" 
                className="bg-[#1a1525] border border-gray-700 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6366f1] w-full text-sm" 
              />
              <button className="bg-[#6366f1] text-white rounded-r-lg px-3 py-2 font-medium hover:bg-[#6366f1]/90 transition-colors">
                <i className="ri-send-plane-fill"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            &copy; {currentYear} Hacked ATM Token. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Terms</a>
            <a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-[#6366f1] transition-colors text-sm">Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
