/* Native memory that a program views as a SharedArrayBuffer: a reserved
 * region, like a linear memory that reserved its maximum, whose usable length
 * grows in place. */
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define SM_RESERVED 65536u

static uint8_t *memory;
static uint32_t length;

void *sm_memory(void) {
  if (!memory) {
    if (posix_memalign((void **)&memory, 4096, SM_RESERVED) != 0) return NULL;
    memset(memory, 0, SM_RESERVED);
    length = 4096;
    for (uint32_t i = 0; i < 256; i++) memory[i] = (uint8_t)(i * 7);
  }
  return memory;
}

uint32_t sm_length(void) { return length; }

uint32_t sm_grow(uint32_t bytes) {
  if (bytes > SM_RESERVED || bytes < length) return 0;
  for (uint32_t i = length; i < bytes; i++) memory[i] = (uint8_t)(i >> 4);
  length = bytes;
  return length;
}

int32_t sm_read_i32(uint32_t offset) {
  int32_t value;
  __atomic_load(&*(int32_t *)(void *)(memory + offset), &value, __ATOMIC_SEQ_CST);
  return value;
}

double sm_read_f64(uint32_t offset) {
  double value;
  memcpy(&value, memory + offset, sizeof value);
  return value;
}

void sm_write_i32(uint32_t offset, int32_t value) {
  __atomic_store_n((int32_t *)(void *)(memory + offset), value, __ATOMIC_SEQ_CST);
}
