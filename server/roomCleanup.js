import { supabase } from './supabaseClient.js';

/**
 * Room Cleanup Service
 * Automatically closes inactive rooms and cleans up resources
 */

export class RoomCleanupService {
  constructor() {
    this.intervalId = null;
    this.cleanupInterval = 3 * 60 * 1000; // 3 minutes (reduced from 5)
    this.inactiveThreshold = 15; // 15 minutes (reduced from 30)
  }

  /**
   * Start the cleanup service
   */
  start() {
    console.log('🚀 Starting room cleanup service...');
    console.log(`⏰ Cleanup interval: ${this.cleanupInterval / 1000 / 60} minutes`);
    console.log(`⏳ Inactive threshold: ${this.inactiveThreshold} minutes`);

    // Run initial cleanup
    this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Room cleanup service stopped');
    }
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    try {
      console.log('🧹 Running room cleanup...');

      // Get room activity info
      const { data: roomActivity, error: activityError } = await supabase
        .rpc('get_room_activity');

      if (activityError) {
        console.error('Error getting room activity:', activityError);
        return;
      }

      if (!roomActivity || roomActivity.length === 0) {
        console.log('✅ No waiting rooms found');
        return;
      }

      console.log(`📊 Found ${roomActivity.length} waiting rooms`);

      // Check for inactive rooms
      const inactiveRooms = roomActivity.filter(room =>
        room.minutes_inactive > this.inactiveThreshold
      );

      if (inactiveRooms.length === 0) {
        console.log('✅ No inactive rooms to close');
        return;
      }

      console.log(`⚠️ Found ${inactiveRooms.length} inactive rooms to close:`);
      inactiveRooms.forEach(room => {
        console.log(`  - ${room.lobby_name} (${room.minutes_inactive.toFixed(1)} min inactive, ${room.player_count} players)`);
      });

      // Close inactive rooms
      const { data: closedCount, error: closeError } = await supabase
        .rpc('close_inactive_rooms');

      if (closeError) {
        console.error('Error closing inactive rooms:', closeError);
        return;
      }

      if (closedCount > 0) {
        console.log(`✅ Successfully closed ${closedCount} inactive rooms`);
      }

    } catch (error) {
      console.error('Error during room cleanup:', error);
    }
  }

  /**
   * Manual cleanup trigger (for testing/admin purposes)
   */
  async manualCleanup() {
    console.log('🔧 Running manual room cleanup...');
    await this.runCleanup();
  }

  /**
   * Get current room activity status
   */
  async getRoomActivity() {
    try {
      const { data, error } = await supabase.rpc('get_room_activity');

      if (error) {
        console.error('Error getting room activity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getRoomActivity:', error);
      return null;
    }
  }
}

// Export singleton instance
export const roomCleanupService = new RoomCleanupService();
