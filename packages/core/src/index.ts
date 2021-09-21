import { StrykerCli } from './stryker-cli';
import { Stryker } from './stryker';

export { Stryker, StrykerCli };

export { Timer } from './utils/timer';

// One default export for backward compatibility
// eslint-disable-next-line import/no-default-export
export default Stryker;
