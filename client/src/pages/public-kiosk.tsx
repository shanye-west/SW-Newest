import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, QrCode, Maximize2, TrendingUp, TrendingDown, Monitor } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { diffRows, rotate, getSectionTitle, DEFAULT_KIOSK_SETTINGS, type PlayerResult, type SectionType, type RowChange } from '@/lib/kiosk-utils';
import QRCode from 'qrcode';

interface KioskSettings {
  sections: {
    gross: boolean;
    net: boolean;
    skins: boolean;
  };
  rotationInterval: number;
  rowsPerPage: number;
  theme: 'light' | 'dark' | 'auto';
}

interface TournamentResults {
  tournament: {
    name: string;
    date: string;
    course: { name: string };
  };
  results: {
    gross: PlayerResult[];
    net: PlayerResult[];
    skins: PlayerResult[];
  };
}

export default function PublicKiosk() {
  const { token } = useParams<{ token: string }>();
  const [location] = useLocation();
  
  // State
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [previousResults, setPreviousResults] = useState<{ [key in SectionType]: PlayerResult[] }>({
    gross: [],
    net: [],
    skins: []
  });
  const [rowChanges, setRowChanges] = useState<Map<string, RowChange>>(new Map());
  
  // Settings
  const [settings, setSettings] = useState<KioskSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_KIOSK_SETTINGS;
    const stored = localStorage.getItem(`kiosk-settings-${token}`);
    return stored ? { ...DEFAULT_KIOSK_SETTINGS, ...JSON.parse(stored) } : DEFAULT_KIOSK_SETTINGS;
  });
  
  // Refs
  const rotationIntervalRef = useRef<NodeJS.Timeout>();
  const changeAnimationRef = useRef<NodeJS.Timeout>();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(`kiosk-settings-${token}`, JSON.stringify(settings));
  }, [settings, token]);
  
  // Fetch tournament results
  const { data: results, isLoading } = useQuery<TournamentResults>({
    queryKey: ['/api/public/results', token],
    queryFn: async () => {
      const response = await fetch(`/api/public/results/${token}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Get enabled sections
  const getEnabledSections = useCallback((): SectionType[] => {
    return (Object.entries(settings.sections) as [SectionType, boolean][])
      .filter(([_, enabled]) => enabled)
      .map(([section, _]) => section);
  }, [settings.sections]);

  // Handle data updates
  useEffect(() => {
    if (results) {
      setLastUpdate(new Date());
      
      // Calculate changes for current section
      const enabledSections = getEnabledSections();
      const currentSection = enabledSections[currentSectionIndex];
      if (currentSection && results.results[currentSection]) {
        const newChanges = diffRows(previousResults[currentSection], results.results[currentSection]);
        setRowChanges(newChanges);
        
        // Clear change indicators after 3 seconds
        if (changeAnimationRef.current) clearTimeout(changeAnimationRef.current);
        changeAnimationRef.current = setTimeout(() => {
          setRowChanges(new Map());
        }, 3000);
        
        setPreviousResults(prev => ({
          ...prev,
          [currentSection]: results.results[currentSection]
        }));
      }
    }
  }, [results, currentSectionIndex, getEnabledSections, previousResults]);
  
  // Auto-rotation
  useEffect(() => {
    const enabledSections = getEnabledSections();
    if (enabledSections.length <= 1) return;
    
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
    }
    
    rotationIntervalRef.current = setInterval(() => {
      setCurrentSectionIndex(prev => rotate(prev, enabledSections));
      setCurrentPage(0); // Reset to first page when changing sections
    }, settings.rotationInterval * 1000);
    
    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [settings.rotationInterval, getEnabledSections]);
  
  // Theme handling
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto theme based on system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = () => {
        root.classList.toggle('dark', mediaQuery.matches);
      };
      updateTheme();
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [settings.theme]);
  
  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      
      // Try to acquire wake lock
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (error) {
        console.log('Wake lock failed:', error);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
      
      // Release wake lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's') {
        setSettingsOpen(true);
      }
    };
    
    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, []);
  
  // Long press for settings
  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let pressTimer: NodeJS.Timeout;
    
    const handleTouchStart = () => {
      pressTimer = setTimeout(() => {
        setSettingsOpen(true);
      }, 1500);
    };
    
    const handleTouchEnd = () => {
      clearTimeout(pressTimer);
    };
    
    const header = headerRef.current;
    if (header) {
      header.addEventListener('touchstart', handleTouchStart);
      header.addEventListener('touchend', handleTouchEnd);
      header.addEventListener('touchcancel', handleTouchEnd);
      
      return () => {
        header.removeEventListener('touchstart', handleTouchStart);
        header.removeEventListener('touchend', handleTouchEnd);
        header.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
      if (changeAnimationRef.current) clearTimeout(changeAnimationRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);
  
  if (isLoading || !results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading tournament results...</p>
        </div>
      </div>
    );
  }
  
  const enabledSections = getEnabledSections();
  const currentSection = enabledSections[currentSectionIndex] || 'gross';
  const currentData = results.results[currentSection] || [];
  
  // Pagination
  const totalPages = Math.ceil(currentData.length / settings.rowsPerPage);
  const startIndex = currentPage * settings.rowsPerPage;
  const endIndex = startIndex + settings.rowsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);
  

  
  // QR code generation
  const qrUrl = `${window.location.origin}/public/${token}`;
  
  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  useEffect(() => {
    if (qrOpen && !qrDataUrl) {
      generateQRCode();
    }
  }, [qrOpen, qrDataUrl]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div 
        ref={headerRef}
        className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4"
        data-testid="kiosk-header"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {results.tournament.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
              <span>{new Date(results.tournament.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{results.tournament.course.name}</span>
              <span>•</span>
              <span>Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQrOpen(true)}
              data-testid="button-qr-code"
            >
              <QrCode className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              data-testid="button-fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {getSectionTitle(currentSection)}
              </h2>
              {enabledSections.length > 1 && (
                <Badge variant="outline" className="text-sm">
                  {currentSectionIndex + 1} of {enabledSections.length}
                </Badge>
              )}
            </div>
            
            {totalPages > 1 && (
              <Badge variant="outline" className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </Badge>
            )}
          </div>
          
          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-lg font-medium text-gray-500 dark:text-gray-400">
                        Pos
                      </th>
                      <th className="px-6 py-4 text-left text-lg font-medium text-gray-500 dark:text-gray-400">
                        Player
                      </th>
                      <th className="px-6 py-4 text-center text-lg font-medium text-gray-500 dark:text-gray-400">
                        {currentSection === 'skins' ? 'Skins' : 'Score'}
                      </th>
                      {currentSection === 'skins' && (
                        <th className="px-6 py-4 text-center text-lg font-medium text-gray-500 dark:text-gray-400">
                          Payout
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedData.map((player: PlayerResult, index: number) => {
                      const absolutePosition = startIndex + index + 1;
                      const change = rowChanges.get(player.playerName);
                      
                      return (
                        <tr 
                          key={player.playerName}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          data-testid={`kiosk-row-${player.playerName}`}
                        >
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {player.position || absolutePosition}
                              </span>
                              {change && change.type !== 'none' && (
                                <div className="animate-pulse">
                                  {change.type === 'up' ? (
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-xl font-medium text-gray-900 dark:text-white">
                              {player.playerName}
                            </span>
                            {player.tiebreaker && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {player.tiebreaker}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {currentSection === 'skins' 
                                ? player.skinsCount || 0
                                : currentSection === 'gross' 
                                  ? player.grossTotal 
                                  : player.netTotal
                              }
                            </span>
                          </td>
                          {currentSection === 'skins' && (
                            <td className="px-6 py-6 text-center">
                              <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                                {player.skinsPayout ? `$${(player.skinsPayout / 100).toFixed(2)}` : '-'}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-kiosk-settings">
          <DialogHeader>
            <DialogTitle>Kiosk Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Sections */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Display Sections</Label>
              {(['gross', 'net', 'skins'] as const).map(section => (
                <div key={section} className="flex items-center justify-between">
                  <Label htmlFor={`section-${section}`} className="capitalize">
                    {getSectionTitle(section)}
                  </Label>
                  <Switch
                    id={`section-${section}`}
                    checked={settings.sections[section]}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        sections: { ...prev.sections, [section]: checked }
                      }))
                    }
                    data-testid={`switch-section-${section}`}
                  />
                </div>
              ))}
            </div>
            
            {/* Rotation Interval */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Rotation Interval</Label>
              <Select
                value={settings.rotationInterval.toString()}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, rotationInterval: parseInt(value) }))
                }
              >
                <SelectTrigger data-testid="select-rotation-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="8">8 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="20">20 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Rows Per Page */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Rows Per Page</Label>
              <Select
                value={settings.rowsPerPage.toString()}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, rowsPerPage: parseInt(value) }))
                }
              >
                <SelectTrigger data-testid="select-rows-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="15">15 rows</SelectItem>
                  <SelectItem value="20">20 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Theme */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'auto') => 
                  setSettings(prev => ({ ...prev, theme: value }))
                }
              >
                <SelectTrigger data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm text-center" data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>Share Tournament Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg inline-block">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code for tournament results"
                  className="w-48 h-48 mx-auto"
                  data-testid="qr-code-image"
                />
              ) : (
                <div 
                  className="w-48 h-48 mx-auto bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm"
                  data-testid="qr-code-loading"
                >
                  Generating QR Code...
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Scan to view live results on any device
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 font-mono break-all">
                {qrUrl}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}