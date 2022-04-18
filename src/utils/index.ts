export class Utils {
  /**
   * Returns current UTC timestamp in seconds.
   */
  public static getUtcTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
  }
}
