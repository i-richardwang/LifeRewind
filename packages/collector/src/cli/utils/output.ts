import pc from 'picocolors';

export function printBanner(): void {
  console.log(
    pc.cyan(`
  LifeRewind Collector Setup

  This wizard will help you configure the collector.
  Press Enter to accept default values.
`)
  );
}

export function printSection(title: string): void {
  console.log(`\n${pc.bold(pc.blue(title))}`);
  console.log(pc.dim('─'.repeat(45)));
}

export function printSuccess(message: string): void {
  console.log(`${pc.green('✓')} ${message}`);
}

export function printError(message: string): void {
  console.error(`${pc.red('✗')} ${message}`);
}

export function printInfo(message: string): void {
  console.log(`${pc.blue('ℹ')} ${message}`);
}

export function printWarning(message: string): void {
  console.log(`${pc.yellow('⚠')} ${message}`);
}

export function printDim(message: string): void {
  console.log(pc.dim(message));
}
