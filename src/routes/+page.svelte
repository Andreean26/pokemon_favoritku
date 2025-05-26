<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchPokemons, searchPokemon, type Pokemon } from '$lib/services/pokeapi';
  import { 
    pokemonFavorites, 
    addFavorite, 
    updateFavorite, 
    deleteFavorite, 
    type PokemonFavorite 
  } from '$lib/stores/pokemonStore';
  
  let pokemons: Pokemon[] = [];
  let totalPokemons = 0;
  let currentPage = 0;
  let limit = 12;
  let isLoading = false;
  
  // Variabel untuk bagian Pokemon Favoritku (hanya search)
  let favoritesSearchTerm = '';
  
  // Variabel untuk bagian daftar Pokemon (search, sort, filter)
  let searchTerm = '';
  let sortBy = 'name';
  let sortDirection = 'asc';
  let filterType = '';
  
  // For adding/editing
  let selectedPokemon: Pokemon | null = null;
  let pokemonNote = '';
  let isEditing = false;
  let editingId: number | null = null;
  let showModal = false;
  
  // Filtering and sorting
  $: displayedFavorites = filterAndSortFavorites($pokemonFavorites);
  
  // For pagination of favorites
  let favoritesPerPage = 6;
  let favoritesCurrentPage = 0;
  
  $: paginatedFavorites = displayedFavorites.slice(
    favoritesCurrentPage * favoritesPerPage, 
    (favoritesCurrentPage + 1) * favoritesPerPage
  );
  
  $: totalFavoritePages = Math.ceil(displayedFavorites.length / favoritesPerPage);
  
  function filterAndSortFavorites(favorites: PokemonFavorite[]) {
    let filtered = favorites;

    // Filter by search term if provided
    if (favoritesSearchTerm.trim()) {
      filtered = filtered.filter(poke => 
        poke.name.toLowerCase().includes(favoritesSearchTerm.toLowerCase()) ||
        poke.note.toLowerCase().includes(favoritesSearchTerm.toLowerCase())
      );
    }

    // Simple sort by name only for favorites
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Tambahkan reactive statement untuk menerapkan sort dan filter pada daftar Pokemon
  $: sortedAndFilteredPokemons = applySortAndFilter(pokemons);
  
  // Update fungsi applySortAndFilter untuk menangani string comparison dengan benar
  function applySortAndFilter(pokemonList: Pokemon[]) {
    let filtered = [...pokemonList];
    
    // Apply filter by type
    if (filterType) {
      filtered = filtered.filter(pokemon => 
        pokemon.types.some(type => type.type.name === filterType)
      );
    }
    
    // Apply sort dengan penanganan yang lebih baik
    filtered = filtered.sort((a, b) => {
      let valueA: string | number, valueB: string | number;
      
      if (sortBy === 'name') {
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
      } else if (sortBy === 'id') {
        valueA = a.id;
        valueB = b.id;
      } else {
        return 0;
      }
      
      // Gunakan localeCompare untuk string, comparison biasa untuk number
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (sortDirection === 'asc') {
          return valueA.localeCompare(valueB);
        } else {
          return valueB.localeCompare(valueA);
        }
      } else {
        if (sortDirection === 'asc') {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      }
    });
    
    return filtered;
  }
  
  // Tambahkan reactive statements untuk memuat ulang Pokemon ketika filter berubah
  $: if (filterType || sortBy !== 'name' || sortDirection !== 'asc') {
    // Jika ada filter aktif dan kita tidak sedang dalam mode pencarian
    if (!searchTerm.trim()) {
      // Load semua Pokemon untuk bisa difilter dengan benar
      loadAllPokemonsForFiltering();
    }
  }
  
  // Fungsi baru untuk memuat Pokemon ketika filtering
  async function loadAllPokemonsForFiltering() {
    if (isLoading) return;
    
    isLoading = true;
    try {
      // Load lebih banyak Pokemon untuk filtering yang lebih efektif
      const data = await fetchPokemons(151, 0); // Load first 151 Pokemon
      pokemons = data.pokemons;
      totalPokemons = data.count;
    } catch (error) {
      console.error('Failed to load pokemons for filtering:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Modifikasi fungsi loadPokemons agar tidak menerapkan sort/filter di sini
  async function loadPokemons() {
    isLoading = true;
    try {
      const data = await fetchPokemons(limit, currentPage * limit);
      pokemons = data.pokemons;
      totalPokemons = data.count;
    } catch (error) {
      console.error('Failed to load pokemons:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Update fungsi handleSearch
  async function handleSearch() {
    if (!searchTerm.trim()) {
      // Jika search kosong, load pokemon biasa
      currentPage = 0;
      loadPokemons();
      return;
    }
    
    try {
      const result = await searchPokemon(searchTerm);
      if (result) {
        // Set hasil pencarian sebagai array dengan satu Pokemon
        pokemons = [result];
        // Reset pagination karena ini hasil pencarian
        currentPage = 0;
        totalPokemons = 1;
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  }
  
  // Update fungsi resetFilters
  function resetFilters() {
    searchTerm = '';
    sortBy = 'name';
    sortDirection = 'asc';
    filterType = '';
    currentPage = 0;
    loadPokemons();
  }
  
  // Fungsi untuk reset halaman favorit saat search
  function handleFavoritesSearch() {
    favoritesCurrentPage = 0;
  }
  
  function selectPokemon(pokemon: Pokemon) {
    selectedPokemon = pokemon;
    pokemonNote = '';
    isEditing = false;
    showModal = true;
  }
  
  function editFavorite(favorite: PokemonFavorite) {
    selectedPokemon = {
      id: favorite.id,
      name: favorite.name,
      sprites: {
        front_default: favorite.sprite,
        other: { 'official-artwork': { front_default: favorite.sprite } }
      },
      types: favorite.types.map(type => ({ slot: 0, type: { name: type } }))
    };
    pokemonNote = favorite.note;
    isEditing = true;
    editingId = favorite.id;
    showModal = true;
  }
  
  function handleSaveFavorite() {
    if (!selectedPokemon || !pokemonNote.trim() || pokemonNote.length > 30) return;
    
    const favorite: PokemonFavorite = {
      id: selectedPokemon.id,
      name: selectedPokemon.name,
      sprite: selectedPokemon.sprites.other['official-artwork'].front_default || selectedPokemon.sprites.front_default,
      types: selectedPokemon.types.map(t => t.type.name),
      note: pokemonNote
    };
    
    if (isEditing && editingId) {
      updateFavorite(editingId, favorite);
    } else {
      addFavorite(favorite);
    }
    
    showModal = false;
    selectedPokemon = null;
    pokemonNote = '';
  }
  
  function handleDelete(id: number) {
    if (confirm('Apakah Anda yakin ingin menghapus Pokemon ini dari favorit?')) {
      deleteFavorite(id);
    }
  }
  
  function changePage(newPage: number) {
    if (newPage >= 0 && newPage * limit < totalPokemons) {
      currentPage = newPage;
      loadPokemons();
    }
  }
  
  function changeFavoritesPage(newPage: number) {
    if (newPage >= 0 && newPage < totalFavoritePages) {
      favoritesCurrentPage = newPage;
    }
  }
  
  onMount(() => {
    loadPokemons();
  });
</script>

<svelte:head>
  <title>Pokemon Favoritku</title>
</svelte:head>

<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
  <!-- Favorites Section -->
  <div class="bg-base-100 rounded-box shadow-xl p-6">
    <h2 class="text-2xl font-bold mb-4">Pokemon Favoritku</h2>
    
    <!-- Search only for favorites -->
    <div class="mb-4">
      <div class="join w-full">
        <input 
          class="join-item input input-bordered w-full" 
          type="text" 
          bind:value={favoritesSearchTerm} 
          placeholder="Cari pokemon favorit..."
        />
        <button class="join-item btn btn-primary" on:click={handleFavoritesSearch}>
          Cari
        </button>
      </div>
    </div>
    
    <!-- Favorites list -->
    {#if paginatedFavorites.length > 0}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each paginatedFavorites as favorite}
          <div class="card bg-base-200">
            <figure class="px-4 pt-4">
              <img src={favorite.sprite} alt={favorite.name} class="rounded-xl h-32 w-32 object-contain" />
            </figure>
            <div class="card-body p-4">
              <h3 class="card-title capitalize">{favorite.name}</h3>
              <div class="flex flex-wrap gap-1 my-1">
                {#each favorite.types as type}
                  <span class="badge badge-outline capitalize">{type}</span>
                {/each}
              </div>
              <p class="text-sm mb-2">"{favorite.note}"</p>
              <div class="card-actions justify-end">
                <button class="btn btn-sm btn-info" on:click={() => editFavorite(favorite)}>
                  Edit
                </button>
                <button class="btn btn-sm btn-error" on:click={() => handleDelete(favorite.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Pagination for favorites -->
      <div class="flex justify-center mt-4">
        <div class="join">
          <button class="join-item btn" disabled={favoritesCurrentPage === 0}
            on:click={() => changeFavoritesPage(favoritesCurrentPage - 1)}>
            «
          </button>
          <button class="join-item btn">
            Page {favoritesCurrentPage + 1} of {totalFavoritePages}
          </button>
          <button class="join-item btn" disabled={favoritesCurrentPage >= totalFavoritePages - 1}
            on:click={() => changeFavoritesPage(favoritesCurrentPage + 1)}>
            »
          </button>
        </div>
      </div>
    {:else}
      <div class="alert">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Belum ada Pokemon favorit. Tambahkan dari daftar di sebelah kanan.</span>
      </div>
    {/if}
  </div>
  
  <!-- PokeAPI Section -->
  <div class="bg-base-100 rounded-box shadow-xl p-6">
    <h2 class="text-2xl font-bold mb-4">Daftar Pokemon</h2>
    
    <!-- Search, Sort, and Filter for Pokemon list -->
    <div class="mb-4 flex flex-col gap-2">
      <div class="join">
        <input 
          class="join-item input input-bordered w-full" 
          type="text" 
          bind:value={searchTerm} 
          placeholder="Cari pokemon..."
          on:input={() => {
            // Reset filter saat mencari
            if (searchTerm.trim()) {
              filterType = '';
              sortBy = 'name';
              sortDirection = 'asc';
            }
          }}
        />
        <button class="join-item btn btn-primary" on:click={handleSearch}>
          Cari
        </button>
        <button class="join-item btn btn-secondary" on:click={resetFilters}>
          Reset
        </button>
      </div>
      
      <div class="flex flex-wrap gap-2">
        <select class="select select-bordered w-full md:w-auto" bind:value={sortBy}>
          <option value="name">Sort by name</option>
          <option value="id">Sort by ID</option>
        </select>
        
        <select class="select select-bordered w-full md:w-auto" bind:value={sortDirection}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        
        <select class="select select-bordered w-full md:w-auto" bind:value={filterType}>
          <option value="">All types</option>
          <option value="normal">Normal</option>
          <option value="fire">Fire</option>
          <option value="water">Water</option>
          <option value="grass">Grass</option>
          <option value="electric">Electric</option>
          <option value="ice">Ice</option>
          <option value="fighting">Fighting</option>
          <option value="poison">Poison</option>
          <option value="ground">Ground</option>
          <option value="flying">Flying</option>
          <option value="psychic">Psychic</option>
          <option value="bug">Bug</option>
          <option value="rock">Rock</option>
          <option value="ghost">Ghost</option>
          <option value="dark">Dark</option>
          <option value="dragon">Dragon</option>
          <option value="steel">Steel</option>
          <option value="fairy">Fairy</option>
        </select>
      </div>
    </div>
    
    <!-- Pokemon list from API -->
    {#if isLoading}
      <div class="flex justify-center my-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if sortedAndFilteredPokemons.length === 0}
      <div class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
        <span>Tidak ada Pokemon yang sesuai dengan filter yang dipilih.</span>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each sortedAndFilteredPokemons as pokemon}
          <div class="card bg-base-200 hover:bg-base-300 cursor-pointer" on:click={() => selectPokemon(pokemon)}>
            <figure class="px-4 pt-4">
              <img 
                src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default} 
                alt={pokemon.name} 
                class="rounded-xl h-24 w-24 object-contain" 
              />
            </figure>
            <div class="card-body p-4">
              <h3 class="card-title capitalize text-center">{pokemon.name}</h3>
              <div class="flex justify-center flex-wrap gap-1">
                {#each pokemon.types as { type }}
                  <span class="badge badge-sm badge-outline capitalize">{type.name}</span>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Show filter info -->
      {#if filterType || sortBy !== 'name' || sortDirection !== 'asc' || searchTerm.trim()}
        <div class="alert alert-info mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>
            Menampilkan {sortedAndFilteredPokemons.length} Pokemon
            {#if searchTerm.trim()} dengan pencarian "{searchTerm}"{/if}
            {#if filterType} dengan tipe {filterType}{/if}
            {#if sortBy !== 'name' || sortDirection !== 'asc'} 
              diurutkan berdasarkan {sortBy} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
            {/if}
          </span>
        </div>
      {/if}
      
      <!-- Pagination for PokeAPI (hanya tampil jika tidak ada filter aktif) -->
      {#if !filterType && sortBy === 'name' && sortDirection === 'asc' && !searchTerm.trim()}
        <div class="flex justify-center mt-4">
          <div class="join">
            <button class="join-item btn" disabled={currentPage === 0}
              on:click={() => changePage(currentPage - 1)}>
              «
            </button>
            <button class="join-item btn">
              Page {currentPage + 1} of {Math.ceil(totalPokemons / limit)}
            </button>
            <button class="join-item btn" disabled={(currentPage + 1) * limit >= totalPokemons}
              on:click={() => changePage(currentPage + 1)}>
              »
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Add/Edit Pokemon Modal -->
{#if showModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">
        {isEditing ? 'Edit' : 'Tambahkan'} Pokemon Favorit
      </h3>
      
      {#if selectedPokemon}
        <div class="flex justify-center mb-4">
          <img 
            src={selectedPokemon.sprites.other['official-artwork'].front_default || selectedPokemon.sprites.front_default} 
            alt={selectedPokemon.name} 
            class="h-40 w-40 object-contain" 
          />
        </div>
        
        <h4 class="text-xl font-semibold text-center capitalize mb-2">{selectedPokemon.name}</h4>
        
        <div class="flex justify-center flex-wrap gap-2 mb-4">
          {#each selectedPokemon.types as { type }}
            <span class="badge badge-lg capitalize">{type.name}</span>
          {/each}
        </div>
        
        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">Catatan (maks. 30 karakter)</span>
          </label>
          <textarea 
            class="textarea textarea-bordered w-full" 
            maxlength="30" 
            bind:value={pokemonNote} 
            placeholder="Catatan tentang pokemon ini..."
          ></textarea>
          <label class="label">
            <span class="label-text-alt">{pokemonNote.length}/30 karakter</span>
          </label>
        </div>
        
        <div class="modal-action">
          <button class="btn" on:click={() => showModal = false}>Cancel</button>
          <button 
            class="btn btn-primary" 
            disabled={!pokemonNote.trim() || pokemonNote.length > 30}
            on:click={handleSaveFavorite}
          >
            {isEditing ? 'Update' : 'Tambahkan'}
          </button>
        </div>
      {/if}
    </div>
    <div class="modal-backdrop" on:click={() => showModal = false}></div>
  </div>
{/if}
