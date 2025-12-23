import { getCharacterConfig, characters } from '@/lib/characters.config';

describe('Character Configuration', () => {
  describe('getCharacterConfig', () => {
    it('should return Lexi config for chatwithlexi.com', () => {
      const config = getCharacterConfig('chatwithlexi.com');
      expect(config.key).toBe('lexi');
      expect(config.displayName).toBe('Lexi');
      expect(config.theme.accent).toBe('#ff7db5');
    });

    it('should return Nyx config for talktonyx.com', () => {
      const config = getCharacterConfig('talktonyx.com');
      expect(config.key).toBe('nyx');
      expect(config.displayName).toBe('Nyx');
      expect(config.theme.accent).toBe('#9c27b0');
    });

    // Male character tests
    it('should return Dom config for dominicreyes.com', () => {
      const config = getCharacterConfig('dominicreyes.com');
      expect(config.key).toBe('dom');
      expect(config.displayName).toBe('Dominic');
      expect(config.theme.accent).toBe('#7a5cff');
      expect(config.theme.nsfw).toBe('#5b4bff');
    });

    it('should return Chase config for chasehunter.com', () => {
      const config = getCharacterConfig('chasehunter.com');
      expect(config.key).toBe('chase');
      expect(config.displayName).toBe('Chase');
      expect(config.theme.accent).toBe('#ff4757');
      expect(config.theme.nsfw).toBe('#e74c3c');
    });

    it('should return Ethan config for ethanbrooks.com', () => {
      const config = getCharacterConfig('ethanbrooks.com');
      expect(config.key).toBe('ethan');
      expect(config.displayName).toBe('Ethan');
      expect(config.theme.accent).toBe('#4dabf7');
      expect(config.theme.nsfw).toBe('#228be6');
    });

    it('should return Jayden config for jaydencarter.com', () => {
      const config = getCharacterConfig('jaydencarter.com');
      expect(config.key).toBe('jayden');
      expect(config.displayName).toBe('Jayden');
      expect(config.theme.accent).toBe('#51cf66');
      expect(config.theme.nsfw).toBe('#37b24d');
    });

    it('should return Miles config for milestanaka.com', () => {
      const config = getCharacterConfig('milestanaka.com');
      expect(config.key).toBe('miles');
      expect(config.displayName).toBe('Miles');
      expect(config.theme.accent).toBe('#f59f00');
      expect(config.theme.nsfw).toBe('#ff922b');
    });
  });

  describe('Domain mapping', () => {
    describe('Male character domains', () => {
      it('should map all Dom domains correctly', () => {
        const domDomains = [
          'chatwithdom.com',
          'dominicreyes.com', 
          'sirdominic.com',
          'obeydom.com',
          'dominicdom.com',
          'talktodominic.com'
        ];

        domDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('dom');
          expect(config.displayName).toBe('Dominic');
        });
      });

      it('should map all Chase domains correctly', () => {
        const chaseDomains = [
          'chatwithchase.com',
          'chasehunter.com',
          'talktochase.com', 
          'fuckboychase.com',
          'chasehottie.com',
          'hotchase.com'
        ];

        chaseDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('chase');
          expect(config.displayName).toBe('Chase');
        });
      });

      it('should map all Ethan domains correctly', () => {
        const ethanDomains = [
          'chatwithethan.com',
          'ethanbrooks.com',
          'bossethan.com',
          'ethanbusiness.com',
          'talktoehan.com'
        ];

        ethanDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('ethan');
          expect(config.displayName).toBe('Ethan');
        });
      });

      it('should map all Jayden domains correctly', () => {
        const jaydenDomains = [
          'chatwithjayden.com',
          'jaydencarter.com',
          'jaydenvibes.com',
          'chillwithjayden.com',
          'jaydensurfer.com'
        ];

        jaydenDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('jayden');
          expect(config.displayName).toBe('Jayden');
        });
      });

      it('should map all Miles domains correctly', () => {
        const milesDomains = [
          'chatwithmiles.com',
          'milestanaka.com',
          'geekwithmiles.com',
          'milestech.com',
          'nerdwithmiles.com'
        ];

        milesDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('miles');
          expect(config.displayName).toBe('Miles');
        });
      });
    });

    describe('Female character domains', () => {
      it('should map all Lexi domains correctly', () => {
        const lexiDomains = [
          'chatwithlexi.com',
          'heyitslexi.com',
          'lexilove.com',
          'sweetlexi.com',
          'talktolexi.com'
        ];

        lexiDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('lexi');
          expect(config.displayName).toBe('Lexi');
        });
      });

      it('should map all Nyx domains correctly', () => {
        const nyxDomains = [
          'talktonyx.com',
          'nyxafterdark.com',
          'nyxatnight.com',
          'nyxatnite.com',
          'darkwithnyx.com',
          'chatnyx.com'
        ];

        nyxDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('nyx');
          expect(config.displayName).toBe('Nyx');
        });
      });

      it('should map all Chloe domains correctly', () => {
        const chloeDomains = [
          'chatwithchloe.com',
          'studywithchloe.com',
          'smartchloe.com',
          'chloesmart.com'
        ];

        chloeDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('chloe');
          expect(config.displayName).toBe('Chloe');
        });
      });

      it('should map all Aiko domains correctly', () => {
        const aikoDomains = [
          'chatwithaiko.com',
          'waifuwithaiko.com',
          'aikochan.com',
          'sweetaiko.com'
        ];

        aikoDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('aiko');
          expect(config.displayName).toBe('Aiko');
        });
      });

      it('should map all Zaria domains correctly', () => {
        const zariaDomains = [
          'chatwithzaria.com',
          'glowwithzaria.com',
          'zariaglow.com',
          'brightzaria.com'
        ];

        zariaDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('zaria');
          expect(config.displayName).toBe('Zaria');
        });
      });

      it('should map all Nova domains correctly', () => {
        const novaDomains = [
          'chatwithnova.com',
          'novadark.com',
          'darkstar.com',
          'novanight.com'
        ];

        novaDomains.forEach(domain => {
          const config = getCharacterConfig(domain);
          expect(config.key).toBe('nova');
          expect(config.displayName).toBe('Nova');
        });
      });
    });
  });

  describe('Additional functionality', () => {
    it('should handle www prefix', () => {
      const config = getCharacterConfig('www.chatwithlexi.com');
      expect(config.key).toBe('lexi');
    });

    it('should fallback to localhost for development domains', () => {
      const config = getCharacterConfig('localhost:3000');
      expect(config).toBeDefined();
      
      const configVercel = getCharacterConfig('test.vercel.app');
      expect(configVercel).toBeDefined();
    });

    it('should fallback to Lexi for unknown domains', () => {
      const config = getCharacterConfig('unknown.example.com');
      expect(config.key).toBe('lexi');
      expect(config.displayName).toBe('Lexi');
    });
  });

  describe('Character Configurations', () => {
    it('should have required fields for all characters', () => {
      Object.values(characters).forEach(character => {
        expect(character).toHaveProperty('key');
        expect(character).toHaveProperty('displayName');
        expect(character).toHaveProperty('theme');
        expect(character).toHaveProperty('products');
        expect(character).toHaveProperty('calling');
        expect(character).toHaveProperty('og');
        expect(character).toHaveProperty('email');
        
        // Theme validation
        expect(character.theme).toHaveProperty('bg');
        expect(character.theme).toHaveProperty('accent');
        expect(character.theme).toHaveProperty('primary');
        expect(character.theme).toHaveProperty('secondary');
        expect(character.theme).toHaveProperty('gradient');
        
        // Products validation
        expect(character.products).toHaveProperty('sub_sfw');
        expect(character.products).toHaveProperty('sub_nsfw');
        expect(character.products).toHaveProperty('voice_pack_10');
        expect(character.products).toHaveProperty('voice_pack_25');
        expect(character.products).toHaveProperty('voice_pack_50');
        expect(character.products).toHaveProperty('voice_pack_100');
        
        // Calling validation
        expect(character.calling).toHaveProperty('enabled');
        expect(character.calling).toHaveProperty('creditsPerMinute');
        expect(character.calling).toHaveProperty('description');
      });
    });

    it('should have valid calling rates', () => {
      Object.values(characters).forEach(character => {
        if (character.calling?.enabled) {
          expect(character.calling.creditsPerMinute).toBeGreaterThan(0);
          expect(typeof character.calling.description).toBe('string');
          expect(character.calling.description.length).toBeGreaterThan(0);
        }
      });
    });
  });
});