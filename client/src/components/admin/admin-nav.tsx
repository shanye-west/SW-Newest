'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MapPin, Trophy, UsersIcon, Home } from 'lucide-react';

export default function AdminNav() {
  const adminLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/players', label: 'Players', icon: Users },
    { href: '/courses', label: 'Courses', icon: MapPin },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/groups', label: 'Groups', icon: UsersIcon },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">SW Monthly Golf Admin</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Icon className="w-8 h-8 mx-auto mb-3 text-green-600" />
                  <h3 className="font-semibold text-lg">{link.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage {link.label.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>1. Add players with their handicap index (HI)</li>
          <li>2. Create golf courses with par, slope, and rating</li>
          <li>3. Set up tournaments with course and settings</li>
          <li>4. Organize players into groups with tee times</li>
          <li>5. Use the PWA for mobile scoring during rounds</li>
        </ol>
      </div>
    </div>
  );
}