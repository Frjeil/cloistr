import { Tooltip, type TooltipProps, useComputedColorScheme, useMantineTheme } from '@mantine/core'

type AppTooltipProps = TooltipProps

export function AppTooltip({
  children,
  label,
  withinPortal = true,
  zIndex = 1600,
  arrowSize = 6,
  withArrow = true,
  styles: stylesOverride,
  ...rest
}: AppTooltipProps) {
  const theme = useMantineTheme()
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false })
  const isDark = colorScheme === 'dark'
  const baseBackground = isDark ? theme.colors.dark[6] : theme.white
  const baseBorder = isDark ? theme.colors.dark[4] : theme.colors.gray[3]
  const baseColor = isDark ? theme.colors.gray[1] : theme.colors.dark[7]

  const styles = stylesOverride
    ? {
        tooltip: {
          backgroundColor: baseBackground,
          color: baseColor,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: baseBorder,
          boxShadow: theme.shadows.sm,
          fontSize: 12,
          padding: '6px 10px',
        },
        arrow: {
          backgroundColor: baseBackground,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: baseBorder,
        },
        ...stylesOverride,
      }
    : {
        tooltip: {
          backgroundColor: baseBackground,
          color: baseColor,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: baseBorder,
          boxShadow: theme.shadows.sm,
          fontSize: 12,
          padding: '6px 10px',
        },
        arrow: {
          backgroundColor: baseBackground,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: baseBorder,
        },
      }

  return (
    <Tooltip
      label={label}
      withArrow={withArrow}
      arrowSize={arrowSize}
      withinPortal={withinPortal}
      zIndex={zIndex}
      styles={styles}
      {...rest}
    >
      {children}
    </Tooltip>
  )
}
