import { RatingPoint } from './rating-point';

// Jedna linija za grafik ocena, da svaki proizvod moze posebno da se iskljuci
export class RatingSeries {
    code = '';
    name = '';
    points: RatingPoint[] = [];
}
