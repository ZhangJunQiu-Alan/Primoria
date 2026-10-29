import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import { loadFont as loadMono } from '@remotion/google-fonts/GeistMono';
import { loadFont as loadNewsreader } from '@remotion/google-fonts/Newsreader';

export const fonts = {
  body: loadGeist('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily,
  mono: loadMono('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily,
  title: loadNewsreader('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily,
};
