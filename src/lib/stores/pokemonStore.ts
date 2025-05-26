// filepath: e:\Adam\andreean_admin\personal_admin\src\lib\stores\pokemonStore.ts
import { writable } from 'svelte/store';

export type PokemonFavorite = {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  note: string;
};

// Load favorites from localStorage if available
const storedFavorites = typeof localStorage !== 'undefined' ? 
  JSON.parse(localStorage.getItem('pokemonFavorites') || '[]') : [];

export const pokemonFavorites = writable<PokemonFavorite[]>(storedFavorites);

// Subscribe to changes and update localStorage
if (typeof localStorage !== 'undefined') {
  pokemonFavorites.subscribe(value => {
    localStorage.setItem('pokemonFavorites', JSON.stringify(value));
  });
}

export const addFavorite = (pokemon: PokemonFavorite) => {
  pokemonFavorites.update(favorites => [...favorites, pokemon]);
};

export const updateFavorite = (id: number, updatedPokemon: PokemonFavorite) => {
  pokemonFavorites.update(favorites => 
    favorites.map(pokemon => pokemon.id === id ? updatedPokemon : pokemon)
  );
};

export const deleteFavorite = (id: number) => {
  pokemonFavorites.update(favorites => favorites.filter(pokemon => pokemon.id !== id));
};