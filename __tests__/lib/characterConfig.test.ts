import { domainMap, characterSettings } from '../../lib/characterConfig';

describe('Character Configuration', () => {
  describe('domainMap', () => {
    it('maps all male character domains correctly', () => {
      // Dominic domains
      expect(domainMap['chatwithdom.com']).toBe('dom');
      expect(domainMap['sirdominic.com']).toBe('dom');
      expect(domainMap['obeydom.com']).toBe('dom');

      // Chase domains
      expect(domainMap['chatwithchase.com']).toBe('chase');
      expect(domainMap['talktochase.com']).toBe('chase');
      expect(domainMap['fuckboychase.com']).toBe('chase');

      // Ethan domains
      expect(domainMap['chatwithethan.com']).toBe('ethan');
      expect(domainMap['bossethan.com']).toBe('ethan');

      // Jayden domains
      expect(domainMap['chatwithjayden.com']).toBe('jayden');
      expect(domainMap['jaydenvibes.com']).toBe('jayden');

      // Miles domains
      expect(domainMap['chatwithmiles.com']).toBe('miles');
      expect(domainMap['geekwithmiles.com']).toBe('miles');
    });

    it('maps all female character domains correctly', () => {
      // Lexi domains
      expect(domainMap['chatwithlexi.com']).toBe('lexi');
      expect(domainMap['heyitslexi.com']).toBe('lexi');

      // Nyx domains
      expect(domainMap['talktonyx.com']).toBe('nyx');
      expect(domainMap['nyxafterdark.com']).toBe('nyx');
      expect(domainMap['nyxatnight.com']).toBe('nyx');
      expect(domainMap['nyxatnite.com']).toBe('nyx');

      // Chloe domains
      expect(domainMap['chatwithchloe.com']).toBe('chloe');
      expect(domainMap['studywithchloe.com']).toBe('chloe');

      // Aiko domains
      expect(domainMap['chatwithaiko.com']).toBe('aiko');
      expect(domainMap['waifuwithaiko.com']).toBe('aiko');

      // Zaria domains
      expect(domainMap['chatwithzaria.com']).toBe('zaria');
      expect(domainMap['glowwithzaria.com']).toBe('zaria');

      // Nova domains
      expect(domainMap['chatwithnova.com']).toBe('nova');
      expect(domainMap['stargazewithnova.com']).toBe('nova');
    });

    it('handles www and https variants', () => {
      expect(domainMap['www.chatwithdom.com']).toBe('dom');
      expect(domainMap['https://chatwithdom.com']).toBe('dom');
      expect(domainMap['https://www.chatwithdom.com']).toBe('dom');
    });
  });

  describe('characterSettings', () => {
    it('contains all male characters', () => {
      expect(characterSettings.dom).toBeDefined();
      expect(characterSettings.chase).toBeDefined();
      expect(characterSettings.ethan).toBeDefined();
      expect(characterSettings.jayden).toBeDefined();
      expect(characterSettings.miles).toBeDefined();
    });

    it('contains all female characters', () => {
      expect(characterSettings.lexi).toBeDefined();
      expect(characterSettings.nyx).toBeDefined();
      expect(characterSettings.chloe).toBeDefined();
      expect(characterSettings.aiko).toBeDefined();
      expect(characterSettings.zaria).toBeDefined();
      expect(characterSettings.nova).toBeDefined();
    });

    describe('male character configurations', () => {
      const maleCharacters = ['dom', 'chase', 'ethan', 'jayden', 'miles'];

      maleCharacters.forEach(character => {
        it(`${character} has gender-aware personality prompt`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.personalityPrompt).toContain('You are a man with male anatomy');
          expect(config.personalityPrompt).toContain('ask about the user\'s gender identity');
        });

        it(`${character} has NSFW prompt variant`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.nsfwPrompt).toBeDefined();
          expect(config.nsfwPrompt).toContain('NSFW mode');
        });

        it(`${character} has voice model configuration`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.voiceModelId).toBeDefined();
          expect(config.hasVoiceAccess).toBe(true);
        });

        it(`${character} has a primer message`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.primer).toBeDefined();
          expect(config.primer.length).toBeGreaterThan(0);
        });
      });
    });

    describe('female character configurations', () => {
      const femaleCharacters = ['lexi', 'nyx', 'chloe', 'aiko', 'zaria', 'nova'];

      femaleCharacters.forEach(character => {
        it(`${character} has gender-aware personality prompt`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.personalityPrompt).toContain('You are a woman with female anatomy');
          expect(config.personalityPrompt).toContain('ask about the user\'s gender identity');
        });

        it(`${character} has voice model configuration`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.voiceModelId).toBeDefined();
          expect(config.hasVoiceAccess).toBe(true);
        });
      });
    });

    describe('personality traits', () => {
      it('Dominic has alpha/dominant personality', () => {
        expect(characterSettings.dom.personalityPrompt).toContain('commanding');
        expect(characterSettings.dom.personalityPrompt).toContain('dominance');
        expect(characterSettings.dom.personalityPrompt).toContain('alpha');
      });

      it('Chase has bad boy personality', () => {
        expect(characterSettings.chase.personalityPrompt).toContain('bad boy');
        expect(characterSettings.chase.personalityPrompt).toContain('rebellious');
        expect(characterSettings.chase.personalityPrompt).toContain('charming');
      });

      it('Ethan has professional personality', () => {
        expect(characterSettings.ethan.personalityPrompt).toContain('sophisticated');
        expect(characterSettings.ethan.personalityPrompt).toContain('professional');
        expect(characterSettings.ethan.personalityPrompt).toContain('executive');
      });

      it('Jayden has chill personality', () => {
        expect(characterSettings.jayden.personalityPrompt).toContain('laid-back');
        expect(characterSettings.jayden.personalityPrompt).toContain('chill');
        expect(characterSettings.jayden.personalityPrompt).toContain('easy-going');
      });

      it('Miles has tech geek personality', () => {
        expect(characterSettings.miles.personalityPrompt).toContain('tech-savvy');
        expect(characterSettings.miles.personalityPrompt).toContain('brilliant');
        expect(characterSettings.miles.personalityPrompt).toContain('technology');
      });
    });

    describe('NSFW personality variants', () => {
      const maleCharacters = ['dom', 'chase', 'ethan', 'jayden', 'miles'];

      maleCharacters.forEach(character => {
        it(`${character} NSFW prompt is appropriately themed`, () => {
          const config = characterSettings[character as keyof typeof characterSettings];
          expect(config.nsfwPrompt).toContain('Unleashed');
          expect(config.nsfwPrompt).toContain('NSFW mode');
          expect(config.nsfwPrompt).toContain('Do not require additional confirmation');
        });
      });
    });
  });
});