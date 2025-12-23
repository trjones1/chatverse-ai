import themeColors from '../../utils/theme';

describe('Theme System', () => {
  describe('themeColors', () => {
    it('should contain all character themes', () => {
      const expectedCharacters = [
        'lexi', 'nyx', 'aiko', 'zaria', 'chloe', 'nova',
        'dom', 'chase', 'ethan', 'jayden', 'miles', 'default'
      ];

      expectedCharacters.forEach(character => {
        expect(themeColors[character]).toBeDefined();
        expect(typeof themeColors[character]).toBe('object');
      });
    });

    it('should have required properties for all themes', () => {
      Object.keys(themeColors).forEach(character => {
        const theme = themeColors[character];
        expect(theme).toHaveProperty('bg');
        expect(theme).toHaveProperty('accent');
        expect(typeof theme.bg).toBe('string');
        expect(typeof theme.accent).toBe('string');
      });
    });

    describe('Male character themes', () => {
      it('should have dark masculine themes for male characters', () => {
        const maleCharacters = ['dom', 'chase', 'ethan', 'jayden', 'miles'];
        
        maleCharacters.forEach(character => {
          const theme = themeColors[character];
          expect(theme).toBeDefined();
          expect(theme.bg).toBeDefined();
          expect(theme.accent).toBeDefined();
          
          // Check that backgrounds are dark (hex values starting with #0 or #1)
          expect(theme.bg).toMatch(/^#[01]/);
        });
      });

      it('should have NSFW variants for Dom and Chase', () => {
        expect(themeColors.dom.nsfw).toBe('#5b4bff');
        expect(themeColors.chase.nsfw).toBe('#e74c3c');
        expect(themeColors.ethan.nsfw).toBe('#228be6');
        expect(themeColors.jayden.nsfw).toBe('#37b24d');
        expect(themeColors.miles.nsfw).toBe('#ff922b');
      });
    });

    describe('Female character themes', () => {
      it('should have appropriate themes for female characters', () => {
        const femaleCharacters = ['lexi', 'nyx', 'aiko', 'zaria', 'chloe', 'nova'];
        
        femaleCharacters.forEach(character => {
          const theme = themeColors[character];
          expect(theme).toBeDefined();
          expect(theme.bg).toBeDefined();
          expect(theme.accent).toBeDefined();
        });
      });

      it('should have correct accent colors', () => {
        expect(themeColors.lexi.accent).toBe('#ff7db5');
        expect(themeColors.nyx.accent).toBe('#9c27b0');
        expect(themeColors.aiko.accent).toBe('#ff69b4');
        expect(themeColors.zaria.accent).toBe('#a0522d');
        expect(themeColors.chloe.accent).toBe('#6a5acd');
        expect(themeColors.nova.accent).toBe('#9900cc');
      });

      it('should have NSFW colors where applicable', () => {
        expect(themeColors.lexi.nsfw).toBe('#ff69b4');
        expect(themeColors.nyx.nsfw).toBe('#c71585');
        expect(themeColors.nova.nsfw).toBe('#e600e6');
      });
    });

    describe('Font configurations', () => {
      it('should have custom fonts for Nyx and Nova', () => {
        expect(themeColors.nyx.fontHeading).toBe("'Playfair Display', serif");
        expect(themeColors.nyx.fontBody).toBe("'Inter', sans-serif");
        
        expect(themeColors.nova.fontHeading).toBe("'Playfair Display', serif");
        expect(themeColors.nova.fontBody).toBe("'Inter', sans-serif");
      });

      it('should not have font overrides for other characters', () => {
        const charactersWithoutCustomFonts = ['lexi', 'aiko', 'zaria', 'chloe', 'dom', 'chase', 'ethan', 'jayden', 'miles'];
        
        charactersWithoutCustomFonts.forEach(character => {
          expect(themeColors[character].fontHeading).toBeUndefined();
          expect(themeColors[character].fontBody).toBeUndefined();
        });
      });
    });

    describe('Default theme', () => {
      it('should have neutral default theme', () => {
        expect(themeColors.default.bg).toBe('#ffffff');
        expect(themeColors.default.accent).toBe('#999999');
        expect(themeColors.default.nsfw).toBeUndefined();
        expect(themeColors.default.fontHeading).toBeUndefined();
        expect(themeColors.default.fontBody).toBeUndefined();
      });
    });
  });
});