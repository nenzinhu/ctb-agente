// Ambient types for the test toolchain.
// Pulling in jest-dom here augments Jest's `expect` with matchers such as
// `toBeInTheDocument`, which keeps `tsc --noEmit` green for the test suite.
import '@testing-library/jest-dom';
