import { Link } from 'wouter';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-dark-900 border-t border-dark-700 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="relative w-10 h-10 flex items-center justify-center bg-dark-700 rounded-full overflow-hidden">
                <i className="ri-bank-fill text-primary text-2xl"></i>
              </div>
              <span className="font-display text-xl text-white">Hacked<span className="text-primary">ATM</span></span>
            </Link>
            <p className="text-light-300 text-sm">
              A revolutionary Solana token with built-in referral system and staking rewards.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-light-300 hover:text-primary"><i className="ri-twitter-x-line text-xl"></i></a>
              <a href="#" className="text-light-300 hover:text-primary"><i className="ri-telegram-line text-xl"></i></a>
              <a href="#" className="text-light-300 hover:text-primary"><i className="ri-discord-line text-xl"></i></a>
              <a href="#" className="text-light-300 hover:text-primary"><i className="ri-medium-line text-xl"></i></a>
            </div>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#about" className="text-light-300 hover:text-primary transition-colors text-sm">About</a></li>
              <li><a href="#staking" className="text-light-300 hover:text-primary transition-colors text-sm">Staking</a></li>
              <li><a href="#referral" className="text-light-300 hover:text-primary transition-colors text-sm">Referral</a></li>
              <li><a href="#leaderboard" className="text-light-300 hover:text-primary transition-colors text-sm">Leaderboard</a></li>
              <li><a href="#faq" className="text-light-300 hover:text-primary transition-colors text-sm">FAQ</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="/whitepaper" className="text-light-300 hover:text-primary transition-colors text-sm">Whitepaper</Link></li>
              <li><a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Smart Contract</a></li>
              <li><a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Documentation</a></li>
              <li><a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Token Metrics</a></li>
              <li><a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Audit Reports</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-white font-semibold mb-4">Subscribe</h3>
            <p className="text-light-300 text-sm mb-4">
              Stay updated with the latest news and announcements.
            </p>
            <div className="flex">
              <input type="email" placeholder="Your email" className="bg-dark-700 border border-dark-600 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary w-full text-sm" />
              <button className="bg-primary text-dark-900 rounded-r-lg px-3 py-2 font-medium hover:bg-primary/90 transition-colors">
                <i className="ri-send-plane-fill"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-dark-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-light-300 text-sm">
            &copy; {currentYear} Hacked ATM Token. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Terms</a>
            <a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Privacy</a>
            <a href="#" className="text-light-300 hover:text-primary transition-colors text-sm">Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
