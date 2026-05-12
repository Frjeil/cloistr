import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "IBM Plex Sans", sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
  headings: {
    fontFamily: '"Bricolage Grotesque", -apple-system, system-ui, sans-serif',
    fontWeight: '700',
  },
  components: {
    Button: {
      defaultProps: { radius: 'md' },
      styles: {
        root: { transition: 'all 200ms ease-out' },
      },
    },
    Paper: { defaultProps: { radius: 'md' } },
    Container: { defaultProps: { size: 'lg' } },
    ActionIcon: {
      styles: {
        root: { transition: 'all 200ms ease-out' },
      },
    },
    Anchor: {
      styles: {
        root: { transition: 'color 200ms ease-out' },
      },
    },
    TextInput: {
      styles: {
        input: { transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out' },
      },
    },
  },
})
