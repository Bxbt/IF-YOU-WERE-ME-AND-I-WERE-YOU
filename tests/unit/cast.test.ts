import { describe, expect, it } from 'vitest';
import { rolesFor } from '../../src/scene/cast';
import { DEFAULT_ENV } from '../../src/scene/env';
import { BACKGROUNDS } from '../../src/scene/backgrounds';

describe('scene cast (who stands in each scene)', () => {
  it('story scenes have people; the exterior and title have none', () => {
    expect(rolesFor('bg_apartment_evening', DEFAULT_ENV)).toEqual(['in', 'out']);
    expect(rolesFor('bg_elevator_emergency', DEFAULT_ENV)).toEqual(['in']);
    expect(rolesFor('bg_apartment_kitchen', DEFAULT_ENV)).toEqual(['out']);
    expect(rolesFor('bg_living_room_night', DEFAULT_ENV)).toEqual(['A', 'B']);
    expect(rolesFor('bg_building_exterior_rain', DEFAULT_ENV)).toEqual([]);
    expect(rolesFor('bg_title', DEFAULT_ENV)).toEqual([]);
  });

  it('in the lobby the person from the elevator appears once the door is open', () => {
    expect(rolesFor('bg_lobby_floor6', { ...DEFAULT_ENV, door: 'ajar' })).toEqual(['out']);
    expect(rolesFor('bg_lobby_floor6', { ...DEFAULT_ENV, door: 'open' })).toEqual(['out', 'in']);
  });

  it('every staged background exists in the registry', () => {
    for (const bg of ['bg_apartment_evening', 'bg_apartment_kitchen', 'bg_corridor', 'bg_elevator_interior',
      'bg_elevator_emergency', 'bg_lobby_floor6', 'bg_stairwell', 'bg_living_room_morning', 'bg_living_room_night',
      'bg_rooftop_night']) expect(BACKGROUNDS[bg]).toBeDefined();
  });
});
