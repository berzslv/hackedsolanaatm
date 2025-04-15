import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getLeaderboard, LeaderboardEntry } from '../lib/railway-client';
import { Trophy, Medal, Award } from 'lucide-react';

export function LeaderboardComponent() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    setIsLoading(true);
    getLeaderboard()
      .then(data => {
        setLeaderboard(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching leaderboard:', error);
        setIsLoading(false);
      });
  }, []);
  
  // Function to render rank badge/icon
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="h-5 w-5 text-gray-400" />;
    } else if (rank === 3) {
      return <Award className="h-5 w-5 text-amber-700" />;
    } else {
      return <Badge variant="outline">{rank}</Badge>;
    }
  };
  
  // Function to truncate wallet address
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Top performers in our community</CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="referrers">
        <TabsList className="grid grid-cols-2 mx-6">
          <TabsTrigger value="referrers">Top Referrers</TabsTrigger>
          <TabsTrigger value="stakers">Top Stakers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="referrers">
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">Loading leaderboard data...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-center py-4">No leaderboard data available yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard
                    .sort((a, b) => a.weeklyRank - b.weeklyRank)
                    .slice(0, 5)
                    .map(entry => (
                      <TableRow key={entry.walletAddress}>
                        <TableCell className="flex justify-center">
                          {renderRankBadge(entry.weeklyRank)}
                        </TableCell>
                        <TableCell>{truncateAddress(entry.walletAddress)}</TableCell>
                        <TableCell>{entry.totalReferrals}</TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.totalEarnings} HATM
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="stakers">
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">Loading leaderboard data...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-center py-4">No leaderboard data available yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead className="text-right">Amount Staked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Note: In a real implementation, we would have separate stakers and referrers leaderboards */}
                  {leaderboard
                    .sort((a, b) => a.weeklyRank - b.weeklyRank)
                    .slice(0, 5)
                    .map((entry, index) => (
                      <TableRow key={entry.walletAddress}>
                        <TableCell className="flex justify-center">
                          {renderRankBadge(index + 1)}
                        </TableCell>
                        <TableCell>{truncateAddress(entry.walletAddress)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {/* For demo purposes, we're using a calculated value */}
                          {Math.floor(entry.totalEarnings * 10)} HATM
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

export default LeaderboardComponent;