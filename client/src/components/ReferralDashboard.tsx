import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWalletContext } from '@/context/WalletContext';
import { useTokenData } from '@/context/TokenDataContext';
import { useToast } from '@/hooks/use-toast';
import { shortenAddress } from '@/lib/utils';

const ReferralDashboard = () => {
  const { connected, publicKey } = useWalletContext();
  const { referralCode, referralStats } = useTokenData();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");
  
  useEffect(() => {
    if (connected && referralCode) {
      const baseUrl = window.location.origin;
      setReferralLink(`${baseUrl}/?ref=${referralCode}`);
    } else {
      setReferralLink("");
    }
  }, [connected, referralCode]);
  
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    navigator.clipboard.writeText(referralLink).then(() => {
      toast({
        title: "Link copied!",
        description: "Your referral link has been copied to clipboard."
      });
    }).catch(err => {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually.",
        variant: "destructive"
      });
    });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="bg-dark-700 rounded-xl p-6 border border-dark-600 lg:col-span-3 order-2 lg:order-1">
        <h3 className="text-xl font-semibold mb-6 text-white">Your Referral Dashboard</h3>
        
        <div className="bg-dark-800 rounded-lg p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white">Your Referral Link</h4>
            <div className="px-3 py-1 bg-dark-600 rounded-full text-sm text-light-300">
              {connected && publicKey ? shortenAddress(publicKey.toString()) : 'Wallet Not Connected'}
            </div>
          </div>
          
          <div className="bg-dark-600 rounded-lg p-3 mb-3 flex justify-between items-center">
            <input 
              type="text" 
              value={connected ? referralLink : 'Connect wallet to generate your referral link'} 
              className="bg-transparent w-full outline-none text-light-300 text-sm" 
              readOnly 
            />
            <button 
              className={`ml-2 px-3 py-1 bg-dark-800 rounded text-sm text-light-300 hover:bg-dark-700 ${!connected && 'opacity-50'}`}
              onClick={copyToClipboard}
              disabled={!connected}
            >
              <i className="ri-file-copy-line"></i>
            </button>
          </div>
          
          <div className="bg-dark-600 rounded-lg p-3 flex justify-between items-center">
            <div className="text-light-300 text-sm">Your Referral Code</div>
            <div className="px-3 py-1 bg-dark-800 rounded font-mono text-secondary">
              {connected && referralCode ? referralCode : '----'}
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-800 rounded-lg p-4">
            <p className="text-sm text-light-300 mb-1">Total Referrals</p>
            <p className="text-2xl font-semibold text-white">
              {connected ? referralStats.totalReferrals : '0'}
            </p>
          </div>
          
          <div className="bg-dark-800 rounded-lg p-4">
            <p className="text-sm text-light-300 mb-1">Total Earnings</p>
            <p className="text-2xl font-semibold text-secondary">
              {connected ? `${referralStats.totalEarnings} HATM` : '0 HATM'}
            </p>
          </div>
          
          <div className="bg-dark-800 rounded-lg p-4">
            <p className="text-sm text-light-300 mb-1">Weekly Rank</p>
            <p className="text-2xl font-semibold text-white">
              {connected && referralStats.weeklyRank ? `#${referralStats.weeklyRank}` : '--'}
            </p>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded-lg p-4">
          <h4 className="text-white mb-4">Recent Referral Activity</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-dark-600 text-left">
                  <th className="pb-2 text-light-300 font-medium text-sm">Date</th>
                  <th className="pb-2 text-light-300 font-medium text-sm">Transaction</th>
                  <th className="pb-2 text-light-300 font-medium text-sm">Amount</th>
                  <th className="pb-2 text-light-300 font-medium text-sm">Your Reward</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {connected && referralStats.recentActivity && referralStats.recentActivity.length > 0 ? (
                  referralStats.recentActivity.map((activity, index) => (
                    <tr key={index} className="border-b border-dark-600">
                      <td className="py-3 text-light-300">{activity.date}</td>
                      <td className="py-3 text-light-300">{shortenAddress(activity.transaction)}</td>
                      <td className="py-3 text-light-300">{activity.amount} HATM</td>
                      <td className="py-3 text-secondary">{activity.reward} HATM</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-light-300" colSpan={4}>
                      <div className="flex items-center justify-center">
                        <p>
                          {connected 
                            ? 'No referral activity yet. Share your link to start earning!' 
                            : 'Connect wallet to see your referral activity'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-2 order-1 lg:order-2">
        <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-600 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-white">How It Works</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">1</div>
              <div>
                <h4 className="text-white font-medium mb-1">Connect Your Wallet</h4>
                <p className="text-light-300 text-sm">Link your Solana wallet to generate your unique referral code.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">2</div>
              <div>
                <h4 className="text-white font-medium mb-1">Share Your Link</h4>
                <p className="text-light-300 text-sm">Share your referral link with friends, on social media, or in communities.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">3</div>
              <div>
                <h4 className="text-white font-medium mb-1">Earn Rewards</h4>
                <p className="text-light-300 text-sm">When anyone buys or sells using your link, you earn 3% of the transaction value.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">4</div>
              <div>
                <h4 className="text-white font-medium mb-1">Track Performance</h4>
                <p className="text-light-300 text-sm">Monitor your referrals and earnings in real-time on your dashboard.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-600">
          <h3 className="text-xl font-semibold mb-4 text-white">Fee Structure</h3>
          
          <div className="space-y-4">
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">With Referral (6% fee)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-light-300">Referrer Reward</span>
                  <span className="text-secondary">3%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-light-300">Staking Rewards</span>
                  <span className="text-primary">2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-light-300">Marketing</span>
                  <span className="text-accent">1%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Without Referral (8% fee)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-light-300">Staking Rewards</span>
                  <span className="text-primary">6%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-light-300">Marketing</span>
                  <span className="text-accent">2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
