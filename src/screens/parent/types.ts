import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';

export type Props<N extends keyof HomeStackParams> = NativeStackScreenProps<
  HomeStackParams,
  N
>;
