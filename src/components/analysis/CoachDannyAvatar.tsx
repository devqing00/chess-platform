'use client';

import React from 'react';
import { MentorAvatar } from './MentorAvatar';

export const CoachDannyAvatar: React.FC<{
  mentorId?: string;
  size?: number;
  className?: string;
}> = ({ mentorId = 'coach-danny', size = 56, className = '' }) => {
  return <MentorAvatar mentorId={mentorId} size={size} className={className} />;
};
