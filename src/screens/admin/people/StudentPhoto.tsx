import React from 'react';
import { Image } from 'react-native';
import { Student } from '../../../api/management';
import { Avatar, s } from '../AdminUi';

export function StudentPhoto({
  student,
  compact = false,
}: {
  student: Pick<Student, 'studentName' | 'photoUrl'>;
  compact?: boolean;
}) {
  return student.photoUrl ? (
    <Image
      accessibilityLabel={student.studentName}
      source={{ uri: student.photoUrl }}
      style={[s.avatarImage, compact && s.compactAvatar]}
    />
  ) : (
    <Avatar name={student.studentName} compact={compact} />
  );
}
