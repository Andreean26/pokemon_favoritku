export interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      }
    }
  };
  types: {
    slot: number;
    type: {
      name: string;
    }
  }[];
}

export async function fetchPokemons(limit = 20, offset = 0) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
  const data = await response.json();
  
  // Fetch details for each pokemon
  const promises = data.results.map((pokemon: { url: string }) => 
    fetch(pokemon.url).then(res => res.json())
  );
  
  const pokemonDetails = await Promise.all(promises);
  return {
    pokemons: pokemonDetails,
    count: data.count
  };
}

export async function searchPokemon(name: string): Promise<Pokemon | null> {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Failed to search pokemon:", error);
    return null;
  }
}