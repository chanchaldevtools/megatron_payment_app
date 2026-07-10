// utils/responsive.js
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');


const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;


export const responsiveWidth = (w) => (width * w) / BASE_WIDTH;

export const responsiveHeight = (h) => (height * h) / BASE_HEIGHT;


export const responsiveFont = (size) => size * (width / BASE_WIDTH);
