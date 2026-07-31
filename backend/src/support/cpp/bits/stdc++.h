// =============================================================================
// bits/stdc++.h — compatibility shim
// =============================================================================
// `<bits/stdc++.h>` is not standard C++. It is a libstdc++ *implementation
// detail* that GCC happens to ship, and competitive programmers rely on it
// because it pulls in the whole standard library in one line.
//
// Apple's `g++` is a symlink to clang, which uses libc++ — so the header does
// not exist and every submission opening with it fails to compile before the
// judge ever sees the code. Rather than require everyone to install real GCC,
// this file is placed on the include path so the header resolves.
//
// The runner container (Alpine + real g++) already provides its own; whichever
// compiler is in use, `#include <bits/stdc++.h>` now means the same thing.
//
// `__has_include` guards the headers that are conditional on the standard
// level or the implementation, so this compiles cleanly from C++11 upward
// instead of erroring on whichever one is missing.
// =============================================================================

#ifndef CODEJUDGE_BITS_STDCXX_H
#define CODEJUDGE_BITS_STDCXX_H

// ── C library ────────────────────────────────────────────────────────────────
#include <cassert>
#include <cctype>
#include <cerrno>
#include <cfloat>
#include <climits>
#include <clocale>
#include <cmath>
#include <csetjmp>
#include <csignal>
#include <cstdarg>
#include <cstddef>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>

#if __cplusplus >= 201103L
#include <ccomplex>
#include <cfenv>
#include <cinttypes>
#include <cstdbool>
#include <cstdint>
#include <ctgmath>
#include <cwchar>
#include <cwctype>
#endif

// ── Containers ───────────────────────────────────────────────────────────────
#include <bitset>
#include <deque>
#include <list>
#include <map>
#include <queue>
#include <set>
#include <stack>
#include <vector>

#if __cplusplus >= 201103L
#include <array>
#include <forward_list>
#include <unordered_map>
#include <unordered_set>
#endif

// ── Algorithms, iterators, numerics ──────────────────────────────────────────
#include <algorithm>
#include <complex>
#include <functional>
#include <iterator>
#include <limits>
#include <memory>
#include <numeric>
#include <utility>
#include <valarray>

#if __cplusplus >= 201103L
#include <initializer_list>
#include <random>
#include <ratio>
#include <tuple>
#include <type_traits>
#endif

// ── Strings and streams ──────────────────────────────────────────────────────
#include <fstream>
#include <iomanip>
#include <ios>
#include <iosfwd>
#include <iostream>
#include <istream>
#include <locale>
#include <ostream>
#include <sstream>
#include <streambuf>
#include <string>

#if __cplusplus >= 201103L
#include <regex>
#include <system_error>
#endif

// ── Concurrency ──────────────────────────────────────────────────────────────
// Guarded: a freestanding or single-threaded toolchain may omit these, and a
// missing <thread> should not take the whole header down with it.
#if __cplusplus >= 201103L
#if __has_include(<atomic>)
#include <atomic>
#endif
#if __has_include(<chrono>)
#include <chrono>
#endif
#if __has_include(<condition_variable>)
#include <condition_variable>
#endif
#if __has_include(<future>)
#include <future>
#endif
#if __has_include(<mutex>)
#include <mutex>
#endif
#if __has_include(<thread>)
#include <thread>
#endif
#endif

// ── C++17 and later ──────────────────────────────────────────────────────────
#if __cplusplus >= 201703L
#if __has_include(<any>)
#include <any>
#endif
#if __has_include(<charconv>)
#include <charconv>
#endif
#if __has_include(<execution>)
#include <execution>
#endif
#if __has_include(<filesystem>)
#include <filesystem>
#endif
#if __has_include(<optional>)
#include <optional>
#endif
#if __has_include(<string_view>)
#include <string_view>
#endif
#if __has_include(<variant>)
#include <variant>
#endif
#endif

#if __cplusplus >= 202002L
#if __has_include(<bit>)
#include <bit>
#endif
#if __has_include(<compare>)
#include <compare>
#endif
#if __has_include(<concepts>)
#include <concepts>
#endif
#if __has_include(<numbers>)
#include <numbers>
#endif
#if __has_include(<ranges>)
#include <ranges>
#endif
#if __has_include(<span>)
#include <span>
#endif
#endif

#endif // CODEJUDGE_BITS_STDCXX_H
