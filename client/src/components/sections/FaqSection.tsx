import { GradientText } from "@/components/ui/gradient-text";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FaqSection = () => {
  const faqs = [
    {
      question: "What is Hacked ATM Token?",
      answer: "Hacked ATM is a Solana-based token with a built-in referral system and staking vault. It rewards users for participating in the ecosystem through our innovative tokenomics and reward structures.",
    },
    {
      question: "How does the referral system work?",
      answer: "When you connect your wallet, you receive a unique referral link and code. Share this with others, and when they buy or sell Hacked ATM tokens using your referral, you earn 3% of the transaction value. The total fee with a referral is 6% (3% to referrer, 2% to staking rewards, 1% to marketing).",
    },
    {
      question: "What is the APY for staking?",
      answer: "The APY (Annual Percentage Yield) for staking is dynamic and adjusts based on transaction volume and the total amount of tokens staked. More transactions result in a higher APY, while more tokens staked result in a lower APY. This creates a balanced, sustainable reward system.",
    },
    {
      question: "Is there a penalty for unstaking early?",
      answer: "Yes, if you unstake your tokens within 7 days of staking, a 5% fee is applied (4% is burned and 1% goes to marketing). This discourages early unstaking and helps with token scarcity. After 7 days, you can unstake without any penalties.",
    },
    {
      question: "How are rewards distributed in the staking vault?",
      answer: "Staking rewards come from a portion of all buy and sell transactions (2% with referral, 6% without). These rewards are distributed every 30 minutes and automatically compounded into your staked balance, increasing your earnings over time without manual intervention.",
    },
    {
      question: "What rewards do top referrers and stakers receive?",
      answer: "The top 3 referrers and stakers on the weekly and monthly leaderboards receive additional token airdrops. Top stakers also get APY bonuses (up to +1% extra APY for the #1 staker). All top performers are featured prominently on the website and social media.",
    },
  ];

  return (
    <section id="faq" className="section section-odd">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-foreground">
            Frequently Asked <GradientText>Questions</GradientText>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Everything you need to know about Hacked ATM Token
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card rounded-xl overflow-hidden border border-border"
              >
                <AccordionTrigger className="px-6 py-4 text-foreground font-semibold text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-foreground/70">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
