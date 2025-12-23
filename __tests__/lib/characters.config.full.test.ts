import { characters, getCharacterConfig } from '../../lib/characters.config';

describe('Characters Config', () => {
  describe('character configurations', () => {
    it('contains all required characters', () => {
      // Female characters
      expect(characters['chatwithlexi.com']).toBeDefined();
      expect(characters['talktonyx.com']).toBeDefined();
      expect(characters['chatwithchloe.com']).toBeDefined();
      expect(characters['chatwithaiko.com']).toBeDefined();
      expect(characters['chatwithzaria.com']).toBeDefined();
      expect(characters['chatwithnova.com']).toBeDefined();

      // Male characters
      expect(characters['chatwithdom.com']).toBeDefined();
      expect(characters['chatwithchase.com']).toBeDefined();
      expect(characters['chatwithethan.com']).toBeDefined();
      expect(characters['chatwithjayden.com']).toBeDefined();
      expect(characters['chatwithmiles.com']).toBeDefined();
    });

    it('contains all spicy domain variants', () => {
      // Female spicy domains
      expect(characters['heyitslexi.com']).toBeDefined();
      expect(characters['nyxafterdark.com']).toBeDefined();
      expect(characters['studywithchloe.com']).toBeDefined();
      expect(characters['waifuwithaiko.com']).toBeDefined();
      expect(characters['glowwithzaria.com']).toBeDefined();
      expect(characters['stargazewithnova.com']).toBeDefined();

      // Male spicy domains
      expect(characters['sirdominic.com']).toBeDefined();
      expect(characters['fuckboychase.com']).toBeDefined();
      expect(characters['bossethan.com']).toBeDefined();
      expect(characters['jaydenvibes.com']).toBeDefined();
      expect(characters['geekwithmiles.com']).toBeDefined();
    });

    describe('character structure validation', () => {
      const allCharacterKeys = Object.keys(characters);

      allCharacterKeys.forEach(domain => {
        it(`${domain} has all required fields`, () => {
          const config = characters[domain];
          
          expect(config.key).toBeDefined();
          expect(config.name).toBeDefined();
          expect(config.displayName).toBeDefined();
          expect(config.theme).toBeDefined();
          expect(config.products).toBeDefined();
          expect(config.calling).toBeDefined();
          expect(config.gtm).toBeDefined();
          expect(config.og).toBeDefined();
          expect(config.email).toBeDefined();
        });

        it(`${domain} has valid theme configuration`, () => {
          const config = characters[domain];
          
          expect(config.theme.bg).toBeDefined();
          expect(config.theme.accent).toBeDefined();
          expect(config.theme.primary).toBeDefined();
          expect(config.theme.secondary).toBeDefined();
          expect(config.theme.gradient).toBeDefined();
          
          // Check color format (hex)
          expect(config.theme.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(config.theme.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(config.theme.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(config.theme.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
          
          if (config.theme.nsfw) {
            expect(config.theme.nsfw).toMatch(/^#[0-9a-fA-F]{6}$/);
          }
        });

        it(`${domain} has valid products configuration`, () => {
          const config = characters[domain];
          
          expect(config.products.sub_sfw).toBeDefined();
          expect(config.products.sub_nsfw).toBeDefined();
          expect(config.products.voice_pack_10).toBeDefined();
          expect(config.products.voice_pack_25).toBeDefined();
          expect(config.products.voice_pack_50).toBeDefined();
          expect(config.products.voice_pack_100).toBeDefined();
          expect(config.products.voice_call_premium).toBeDefined();
        });

        it(`${domain} has valid calling configuration`, () => {
          const config = characters[domain];
          
          expect(config.calling.enabled).toBe(true);
          expect(config.calling.creditsPerMinute).toBe(4);
          expect(config.calling.description).toBeDefined();
          expect(config.calling.description.length).toBeGreaterThan(0);
        });

        it(`${domain} has valid OG configuration`, () => {
          const config = characters[domain];
          
          expect(config.og.title).toBeDefined();
          expect(config.og.description).toBeDefined();
          expect(config.og.image).toBeDefined();
          expect(config.og.title.length).toBeGreaterThan(0);
          expect(config.og.description.length).toBeGreaterThan(0);
        });

        it(`${domain} has valid email configuration`, () => {
          const config = characters[domain];
          
          expect(config.email.fromName).toBeDefined();
          expect(config.email.replyTo).toBeDefined();
          expect(config.email.fromName.length).toBeGreaterThan(0);
          expect(config.email.replyTo).toContain('@');
        });
      });
    });
  });

  describe('getCharacterConfig function', () => {
    it('returns correct config for exact hostname match', () => {
      const config = getCharacterConfig('chatwithlexi.com');
      expect(config.key).toBe('lexi');
      expect(config.displayName).toBe('Lexi');
    });

    it('returns correct config for male character', () => {
      const config = getCharacterConfig('chatwithdom.com');
      expect(config.key).toBe('dom');
      expect(config.displayName).toBe('Dominic');
    });

    it('handles www prefix correctly', () => {
      const config = getCharacterConfig('www.chatwithlexi.com');
      expect(config.key).toBe('lexi');
    });

    it('returns localhost config for development domains', () => {
      const config = getCharacterConfig('localhost:3000');
      expect(config.key).toBeDefined();
      
      const configVercel = getCharacterConfig('myapp.vercel.app');
      expect(configVercel.key).toBeDefined();
      
      const config127 = getCharacterConfig('127.0.0.1:3000');
      expect(config127.key).toBeDefined();
    });

    it('falls back to Lexi for unknown domains', () => {
      const config = getCharacterConfig('unknown-domain.com');
      expect(config.key).toBe('lexi');
      expect(config.displayName).toBe('Lexi');
    });
  });

  describe('character branding consistency', () => {
    it('has consistent character keys across related domains', () => {
      // Dominic variations
      expect(characters['chatwithdom.com'].key).toBe('dom');
      expect(characters['sirdominic.com'].key).toBe('dom');
      expect(characters['obeydom.com'].key).toBe('dom');

      // Chase variations
      expect(characters['chatwithchase.com'].key).toBe('chase');
      expect(characters['talktochase.com'].key).toBe('chase');
      expect(characters['fuckboychase.com'].key).toBe('chase');
    });

    it('has appropriate OG titles for character variants', () => {
      // Domain aliases should share the same OG titles as base domains
      expect(characters['chatwithlexi.com'].og.title).toContain('Chat with Lexi');
      expect(characters['heyitslexi.com'].og.title).toContain('Chat with Lexi'); // Same as base
      
      expect(characters['talktonyx.com'].og.title).toContain('Talk to Nyx');
      expect(characters['nyxafterdark.com'].og.title).toContain('Talk to Nyx'); // Same as base
    });

    it('has appropriate email fromName for variants', () => {
      // Domain aliases should share the same email fromName as base domains
      expect(characters['chatwithdom.com'].email.fromName).toBe('Dominic');
      expect(characters['sirdominic.com'].email.fromName).toBe('Dominic'); // Same as base
      expect(characters['obeydom.com'].email.fromName).toBe('Dominic'); // Same as base
      
      expect(characters['chatwithethan.com'].email.fromName).toBe('Ethan');
      expect(characters['bossethan.com'].email.fromName).toBe('Ethan'); // Same as base
    });
  });

  describe('theme color validation', () => {
    const maleCharacterDomains = [
      'chatwithdom.com', 'chatwithchase.com', 'chatwithethan.com', 
      'chatwithjayden.com', 'chatwithmiles.com'
    ];

    maleCharacterDomains.forEach(domain => {
      it(`${domain} has dark masculine theme colors`, () => {
        const config = characters[domain];
        
        // Male characters should have darker backgrounds
        const bgColor = config.theme.bg.toLowerCase();
        expect(bgColor).toMatch(/^#[0-2]/); // Starts with 0, 1, or 2 (darker colors)
      });
    });

    it('characters have unique accent colors', () => {
      const accentColors = new Set();
      const characterKeys = new Set();
      
      Object.values(characters).forEach(config => {
        if (!characterKeys.has(config.key)) {
          characterKeys.add(config.key);
          accentColors.add(config.theme.accent);
        }
      });
      
      // Each unique character should have a different accent color
      expect(accentColors.size).toBe(characterKeys.size);
    });
  });
});