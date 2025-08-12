interface Space {
    /**
     * The given space name.
     */
    name(): string
  
    /**
     * The DID of the space.
     */
    did(): string
  
    /**
     * Whether the space has been registered with the service.
     */
    registered(): boolean
  
    /**
     * User defined space metadata.
     */
    meta(): Record<string, any>

    access: {
        type: "public" | "private"
    }
  }