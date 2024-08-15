const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Gimnasio',
            version: '1.0.0',
            description: 'Documentación de la API para el sistema de gimnasio'
        },
        servers: [
            {
                url: 'https://human-sport.vercel.app',
            },
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    required: ['firstName', 'phone'],
                    properties: {
                        firstName: {
                            type: 'string',
                            description: 'El nombre del usuario'
                        },
                        phone: {
                            type: 'string',
                            description: 'El teléfono del usuario'
                        }
                    }
                },
                Instructor: {
                    type: 'object',
                    required: ['name', 'email'],
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Nombre del instructor'
                        },
                        email: {
                            type: 'string',
                            description: 'Correo electrónico del instructor'
                        }
                    }
                },
                Membership: {
                    type: 'object',
                    required: ['type', 'price'],
                    properties: {
                        type: {
                            type: 'string',
                            description: 'Tipo de membresía'
                        },
                        price: {
                            type: 'number',
                            description: 'Precio de la membresía'
                        }
                    }
                },
                Course: {
                    type: 'object',
                    required: ['name', 'description', 'capacity'],
                    properties: {
                        name: {
                            type: 'string',
                            description: 'El nombre del curso'
                        },
                        description: {
                            type: 'string',
                            description: 'Una breve descripción del curso'
                        },
                        capacity: {
                            type: 'integer',
                            description: 'La capacidad del curso, debe ser un número positivo'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'deleted'],
                            default: 'active'
                        },
                        classDay: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    day: {
                                        type: 'string'
                                    },
                                    time: {
                                        type: 'string'
                                    },
                                    startDate: {
                                        type: 'string',
                                        format: 'date'
                                    },
                                    endDate: {
                                        type: 'string',
                                        format: 'date'
                                    }
                                }
                            }
                        },
                        instructor: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                Booking: {
                    type: 'object',
                    required: ['user', 'course'],
                    properties: {
                        user: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    firstName: {
                                        type: 'string'
                                    },
                                    phone: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        course: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string'
                                    },
                                    description: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'deleted'],
                            default: 'active'
                        },
                        comments: {
                            type: 'string'
                        }
                    }
                }
            }
        }
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
